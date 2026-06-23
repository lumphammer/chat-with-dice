import type { SendEmailOptions } from "#/utils/sendEmail";
import { z } from "zod";

// Where feedback emails are delivered, and where we point users who'd rather
// email us directly. Exported so the contact pages can render it as a mailto.
export const CONTACT_EMAIL = "chatwithdice@lumphammer.net";

// Length limits are exported so the React form can enforce the *same* bounds
// client-side (HTML5 minLength/maxLength) that we enforce here server-side.
export const FEEDBACK_MESSAGE_MIN_LENGTH = 10;
export const FEEDBACK_MESSAGE_MAX_LENGTH = 5000;
export const FEEDBACK_EMAIL_MAX_LENGTH = 254; // max length of a valid email address (RFC 5321)

// "See Other" is the correct redirect for the no-JS path: it turns the POST
// into a GET of the result page, so a browser refresh won't re-submit the form.
const HTTP_SEE_OTHER = 303;
const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_BAD_GATEWAY = 502;

const feedbackSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .max(
      FEEDBACK_EMAIL_MAX_LENGTH,
      `Email must be ${FEEDBACK_EMAIL_MAX_LENGTH} characters or fewer.`,
    )
    .pipe(z.email("Enter a valid email address.")),
  message: z
    .string()
    .trim()
    .min(
      FEEDBACK_MESSAGE_MIN_LENGTH,
      `Message must be at least ${FEEDBACK_MESSAGE_MIN_LENGTH} characters.`,
    )
    .max(
      FEEDBACK_MESSAGE_MAX_LENGTH,
      `Message must be ${FEEDBACK_MESSAGE_MAX_LENGTH} characters or fewer.`,
    ),
});

type FeedbackInput = z.infer<typeof feedbackSchema>;

// Just enough of the session user to attribute the feedback in the email. We
// accept `null` because feedback can be sent by signed-out (or anonymous)
// visitors too.
type FeedbackUser = {
  id: string;
  name?: string | null;
  email: string;
  isAnonymous?: boolean | null;
};

export type FeedbackSendEmail = (options: SendEmailOptions) => Promise<void>;

type HandleFeedbackRequestOptions = {
  request: Request;
  user: FeedbackUser | null;
  apiKey: string;
  from: string;
  // The email transport is injected rather than imported so this handler stays
  // a pure function — the tests exercise the whole flow without touching the
  // network.
  send: FeedbackSendEmail;
};

type FieldErrors = Partial<Record<keyof FeedbackInput, string>>;

/**
 * Handles a POST to the contact form endpoint.
 *
 * The form is built to work with *and* without client-side JavaScript, so this
 * handler speaks two dialects (see {@link makeResponder}):
 *
 *   - "Enhanced" requests come from the React form, which sets
 *     `Accept: application/json` and reads structured JSON back (including
 *     per-field validation errors it can render inline).
 *   - "Native" requests are a plain browser form POST with JS disabled. We
 *     can't return field-level errors usefully here, so we 303-redirect to a
 *     success or problem page. In practice the form's HTML5 constraints
 *     (`required`, `type=email`, min/maxLength) catch most bad input before it
 *     ever reaches the server on this path.
 */
export async function handleFeedbackRequest({
  request,
  user,
  apiKey,
  from,
  send,
}: HandleFeedbackRequestOptions): Promise<Response> {
  const respond = makeResponder(request);

  // CSRF defence: only accept submissions that originate from our own pages.
  // A browser form POST is a "simple request" and isn't blocked by CORS, so we
  // can't rely on the browser to stop a cross-site form from posting here.
  if (!isSameSiteRequest(request)) {
    return respond.failure(
      HTTP_FORBIDDEN,
      "This feedback request was not accepted.",
    );
  }

  // `request.formData()` natively parses both urlencoded and multipart bodies
  // and throws on anything else (e.g. a JSON body), which we turn into a 400.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return respond.failure(
      HTTP_BAD_REQUEST,
      "We couldn't read that feedback submission.",
    );
  }

  // Honeypot: the form ships a visually-hidden "website" field that real users
  // never see. Bots tend to fill every field, so a non-empty value almost
  // always means spam. We return a *success* response rather than an error so
  // the bot can't tell it was caught.
  if (formValue(formData, "website").trim() !== "") {
    return respond.success();
  }

  const result = feedbackSchema.safeParse({
    email: formValue(formData, "email"),
    message: formValue(formData, "message"),
  });

  if (!result.success) {
    // Collapse Zod's issue list into at most one message per field — that's all
    // the form can display next to each input.
    const fieldErrors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (field === "email" || field === "message") {
        fieldErrors[field] ??= issue.message;
      }
    }
    return respond.failure(
      HTTP_BAD_REQUEST,
      "Check the form and try again.",
      fieldErrors,
    );
  }

  const email = buildFeedbackEmail(result.data, user);
  try {
    await send({
      apiKey,
      from,
      to: CONTACT_EMAIL,
      // Reply-To is the visitor's address so we can just hit "reply" to answer
      // them; the actual `from` stays our verified sending address.
      replyTo: result.data.email,
      ...email,
    });
  } catch (error) {
    // Log the underlying transport error server-side, but only ever show the
    // visitor a generic message — delivery details could leak provider info.
    console.error("[chat-with-dice] failed to deliver feedback", error);
    return respond.failure(
      HTTP_BAD_GATEWAY,
      "We couldn't send your feedback. Please try again or email us directly.",
    );
  }

  return respond.success();
}

// Builds the email we send to ourselves. The plain-text `text` part is included
// alongside `html` for clients that don't render HTML and as an anti-spam
// signal; the message body is HTML-escaped so a visitor can't inject markup
// into the email we read.
function buildFeedbackEmail(
  input: FeedbackInput,
  user: FeedbackUser | null,
): Pick<SendEmailOptions, "subject" | "html" | "text"> {
  const account = describeAccount(user);
  const subject = "Feedback for Chat with Dice";
  const text = [
    `Reply email: ${input.email}`,
    account ? `Account: ${account}` : "Account: not signed in",
    "",
    input.message,
  ].join("\n");
  const htmlMessage = escapeHtml(input.message).replaceAll("\n", "<br>");

  return {
    subject,
    text,
    html: `
      <h1>Feedback for Chat with Dice</h1>
      <p><strong>Reply email:</strong> ${escapeHtml(input.email)}</p>
      <p><strong>Account:</strong> ${escapeHtml(account ?? "not signed in")}</p>
      <hr>
      <p>${htmlMessage}</p>
    `.trim(),
  };
}

// A one-line summary of who sent the feedback, for the email header. Anonymous
// accounts have no meaningful name/email, so we just note that and lean on the
// id. The id is always included so we can correlate feedback with an account.
function describeAccount(user: FeedbackUser | null): string | null {
  if (!user) return null;

  const identity = user.isAnonymous
    ? "anonymous account"
    : `${user.name ? `${user.name} ` : ""}<${user.email}>`;
  return `${identity} (${user.id})`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// `FormData.get` can return a `File` (e.g. multipart upload); we only ever want
// string fields, so coerce anything else to an empty string.
function formValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

// Same-site check used for CSRF defence. We prefer the `Sec-Fetch-Site` hint
// where the browser sends it, and otherwise compare the `Origin` header to our
// own. A missing `Origin` is treated as same-site: some browsers/privacy modes
// omit it on top-level navigations, and we'd rather not break legitimate no-JS
// submissions for that.
function isSameSiteRequest(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return false;
  }

  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(request.url).origin;
}

/**
 * Builds the two response shapes this endpoint can return, deciding once (from
 * the `Accept` header) which dialect to speak so the rest of the handler
 * doesn't have to thread that decision through every branch.
 */
function makeResponder(request: Request) {
  // The React form opts into JSON; a plain browser form POST does not.
  const enhanced =
    request.headers.get("accept")?.includes("application/json") ?? false;

  return {
    success(): Response {
      if (enhanced) {
        return Response.json({ ok: true });
      }
      return Response.redirect(
        new URL("/contact/thank-you", request.url),
        HTTP_SEE_OTHER,
      );
    },

    failure(
      status: number,
      message: string,
      fieldErrors?: FieldErrors,
    ): Response {
      if (enhanced) {
        return Response.json(
          {
            ok: false,
            message,
            ...(fieldErrors ? { fieldErrors } : {}),
          },
          { status },
        );
      }
      // Without JS we can't render inline field errors, so every failure lands
      // on the same generic problem page regardless of cause.
      return Response.redirect(
        new URL("/contact/problem", request.url),
        HTTP_SEE_OTHER,
      );
    },
  };
}
