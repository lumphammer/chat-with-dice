import { authClient } from "#/auth/authClient";
import {
  FEEDBACK_EMAIL_MAX_LENGTH,
  FEEDBACK_MESSAGE_MAX_LENGTH,
  FEEDBACK_MESSAGE_MIN_LENGTH,
} from "#/contact/feedback";
import { CircleCheck, Loader, Mail, MessageSquareText } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type FieldErrors = {
  email?: string;
  message?: string;
};

type FailureResponse = {
  ok: false;
  message: string;
  fieldErrors?: FieldErrors;
};

export function FeedbackForm() {
  const { data: sessionData, isPending: isSessionPending } =
    authClient.useSession();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const emailWasEdited = useRef(false);

  useEffect(() => {
    const user = sessionData?.user;
    if (
      !isSessionPending &&
      user &&
      !user.isAnonymous &&
      !emailWasEdited.current
    ) {
      setEmail((currentEmail) => currentEmail || user.email);
    }
  }, [isSessionPending, sessionData]);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const response = await fetch(event.currentTarget.action, {
        method: "POST",
        body: new FormData(event.currentTarget),
        headers: { Accept: "application/json" },
      });
      const body: unknown = await response.json();

      if (response.ok && isSuccessResponse(body)) {
        setIsSent(true);
        return;
      }

      const failure = getFailureResponse(body);
      setError(
        failure?.message ?? "We couldn't send your feedback. Please try again.",
      );
      setFieldErrors(failure?.fieldErrors ?? {});
    } catch {
      setError(
        "We couldn't send your feedback. Check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <section className="card bg-base-100 w-full shadow-xl" aria-live="polite">
        <div className="card-body items-center text-center">
          <CircleCheck className="text-success h-12 w-12" aria-hidden="true" />
          <h2 className="card-title">Feedback sent</h2>
          <p>Thanks for taking the time to get in touch.</p>
          <div className="card-actions mt-2">
            <a className="btn btn-primary" href="/">
              Return home
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form
      action="/contact/submit"
      method="post"
      onSubmit={handleSubmit}
      className="card bg-base-100 w-full shadow-xl"
    >
      <div className="card-body gap-4">
        {error && (
          <div className="alert alert-error text-sm" role="alert">
            <span>{error}</span>
          </div>
        )}

        <fieldset className="fieldset" disabled={isSubmitting}>
          <legend className="fieldset-legend">Your email</legend>
          <label className="input w-full">
            <Mail size={16} className="opacity-50" aria-hidden="true" />
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => {
                emailWasEdited.current = true;
                setEmail(event.target.value);
              }}
              required
              maxLength={FEEDBACK_EMAIL_MAX_LENGTH}
              autoComplete="email"
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={
                fieldErrors.email ? "feedback-email-error" : undefined
              }
            />
          </label>
          {fieldErrors.email && (
            <p id="feedback-email-error" className="text-error mt-1 text-sm">
              {fieldErrors.email}
            </p>
          )}
        </fieldset>

        <fieldset className="fieldset" disabled={isSubmitting}>
          <legend className="fieldset-legend">Message</legend>
          <label className="textarea w-full">
            <MessageSquareText
              size={16}
              className="mt-1 opacity-50"
              aria-hidden="true"
            />
            <textarea
              name="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              minLength={FEEDBACK_MESSAGE_MIN_LENGTH}
              maxLength={FEEDBACK_MESSAGE_MAX_LENGTH}
              rows={8}
              aria-invalid={fieldErrors.message ? true : undefined}
              aria-describedby={
                fieldErrors.message
                  ? "feedback-message-error"
                  : "feedback-message-help"
              }
            />
          </label>
          <p id="feedback-message-help" className="label">
            {FEEDBACK_MESSAGE_MIN_LENGTH}–{FEEDBACK_MESSAGE_MAX_LENGTH}{" "}
            characters
          </p>
          {fieldErrors.message && (
            <p id="feedback-message-error" className="text-error mt-1 text-sm">
              {fieldErrors.message}
            </p>
          )}
        </fieldset>

        <div
          className="absolute left-[-10000px] h-px w-px overflow-hidden"
          aria-hidden="true"
        >
          <label>
            Website
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
            />
          </label>
        </div>

        <div className="card-actions justify-end">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <Loader className="animate-spin" size={18} aria-hidden="true" />
            )}
            {isSubmitting ? "Sending…" : "Send feedback"}
          </button>
        </div>
      </div>
    </form>
  );
}

function isSuccessResponse(value: unknown): value is { ok: true } {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    value.ok === true
  );
}

function getFailureResponse(value: unknown): FailureResponse | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("ok" in value) ||
    value.ok !== false ||
    !("message" in value) ||
    typeof value.message !== "string"
  ) {
    return null;
  }

  const fieldErrors =
    "fieldErrors" in value ? parseFieldErrors(value.fieldErrors) : undefined;
  return { ok: false, message: value.message, fieldErrors };
}

function parseFieldErrors(value: unknown): FieldErrors | undefined {
  if (typeof value !== "object" || value === null) return undefined;

  const fieldErrors: FieldErrors = {};
  if ("email" in value && typeof value.email === "string") {
    fieldErrors.email = value.email;
  }
  if ("message" in value && typeof value.message === "string") {
    fieldErrors.message = value.message;
  }
  return fieldErrors;
}
