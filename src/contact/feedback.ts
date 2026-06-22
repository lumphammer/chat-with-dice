import type { SendEmailOptions } from "#/utils/sendEmail";
import { z } from "zod";

export const CONTACT_EMAIL = "chatwithdice@lumphammer.net";
export const FEEDBACK_MESSAGE_MIN_LENGTH = 10;
export const FEEDBACK_MESSAGE_MAX_LENGTH = 5000;
export const FEEDBACK_EMAIL_MAX_LENGTH = 254;
const HTTP_SEE_OTHER = 303;

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
  send: FeedbackSendEmail;
};

type FieldErrors = Partial<Record<keyof FeedbackInput, string>>;

export async function handleFeedbackRequest({
  request,
  user,
  apiKey,
  from,
  send,
}: HandleFeedbackRequestOptions): Promise<Response> {
  const enhanced =
    request.headers.get("accept")?.includes("application/json") ?? false;

  if (!isSameSiteRequest(request)) {
    return failureResponse({
      request,
      enhanced,
      status: 403,
      message: "This feedback request was not accepted.",
    });
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (
    !contentType.startsWith("application/x-www-form-urlencoded") &&
    !contentType.startsWith("multipart/form-data")
  ) {
    return failureResponse({
      request,
      enhanced,
      status: 415,
      message: "Submit feedback using the contact form.",
    });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return failureResponse({
      request,
      enhanced,
      status: 400,
      message: "We couldn't read that feedback submission.",
    });
  }

  if (formValue(formData, "website").trim() !== "") {
    return successResponse(request, enhanced);
  }

  const result = feedbackSchema.safeParse({
    email: formValue(formData, "email"),
    message: formValue(formData, "message"),
  });

  if (!result.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (field === "email" || field === "message") {
        fieldErrors[field] ??= issue.message;
      }
    }
    return failureResponse({
      request,
      enhanced,
      status: 400,
      message: "Check the form and try again.",
      fieldErrors,
    });
  }

  const email = buildFeedbackEmail(result.data, user);
  try {
    await send({
      apiKey,
      from,
      to: CONTACT_EMAIL,
      replyTo: result.data.email,
      ...email,
    });
  } catch (error) {
    console.error("[chat-with-dice] failed to deliver feedback", error);
    return failureResponse({
      request,
      enhanced,
      status: 502,
      message:
        "We couldn't send your feedback. Please try again or email us directly.",
    });
  }

  return successResponse(request, enhanced);
}

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

function formValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function isSameSiteRequest(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return false;
  }

  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(request.url).origin;
}

function successResponse(request: Request, enhanced: boolean): Response {
  if (enhanced) {
    return Response.json({ ok: true });
  }
  return Response.redirect(
    new URL("/contact/thank-you", request.url),
    HTTP_SEE_OTHER,
  );
}

function failureResponse({
  request,
  enhanced,
  status,
  message,
  fieldErrors,
}: {
  request: Request;
  enhanced: boolean;
  status: number;
  message: string;
  fieldErrors?: FieldErrors;
}): Response {
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
  return Response.redirect(
    new URL("/contact/problem", request.url),
    HTTP_SEE_OTHER,
  );
}
