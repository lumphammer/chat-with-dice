import type { SendEmailOptions } from "#/utils/sendEmail";
import {
  CONTACT_EMAIL,
  FEEDBACK_MESSAGE_MAX_LENGTH,
  handleFeedbackRequest,
  type FeedbackSendEmail,
} from "./feedback";
import { describe, expect, it, vi } from "vitest";

const validInput = {
  email: "player@example.com",
  message: "I have some useful feedback about the dice roller.",
};
const HTTP_OK = 200;
const HTTP_SEE_OTHER = 303;
const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_BAD_GATEWAY = 502;

function makeRequest(
  input: Record<string, string>,
  options: { enhanced?: boolean; origin?: string } = {},
): Request {
  const headers = new Headers();
  if (options.enhanced) headers.set("Accept", "application/json");
  if (options.origin) headers.set("Origin", options.origin);

  return new Request("https://chatwithdice.example/contact/submit", {
    method: "POST",
    headers,
    body: new URLSearchParams(input),
  });
}

async function submit(
  request: Request,
  send: FeedbackSendEmail,
): Promise<Response> {
  return handleFeedbackRequest({
    request,
    user: null,
    apiKey: "test-key",
    from: "Chat with Dice <sender@example.com>",
    send,
  });
}

describe("feedback submission", () => {
  it("sends valid feedback and returns the enhanced success shape", async () => {
    let sentEmail: SendEmailOptions | undefined;
    const send: FeedbackSendEmail = async (options) => {
      sentEmail = options;
    };

    const response = await submit(
      makeRequest(validInput, { enhanced: true }),
      send,
    );

    expect(response.status).toBe(HTTP_OK);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(sentEmail).toMatchObject({
      apiKey: "test-key",
      from: "Chat with Dice <sender@example.com>",
      to: CONTACT_EMAIL,
      replyTo: validInput.email,
      subject: "Feedback for Chat with Dice",
    });
  });

  it("redirects a native form submission to the thank-you page", async () => {
    const response = await submit(makeRequest(validInput), vi.fn());

    expect(response.status).toBe(HTTP_SEE_OTHER);
    expect(response.headers.get("location")).toBe(
      "https://chatwithdice.example/contact/thank-you",
    );
  });

  it("returns field errors for invalid email and message lengths", async () => {
    const send = vi.fn();
    const response = await submit(
      makeRequest(
        {
          email: "not-an-email",
          message: "x".repeat(FEEDBACK_MESSAGE_MAX_LENGTH + 1),
        },
        { enhanced: true },
      ),
      send,
    );

    expect(response.status).toBe(HTTP_BAD_REQUEST);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: "Check the form and try again.",
      fieldErrors: {
        email: "Enter a valid email address.",
        message: `Message must be ${FEEDBACK_MESSAGE_MAX_LENGTH} characters or fewer.`,
      },
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("silently accepts honeypot submissions without sending email", async () => {
    const send = vi.fn();
    const response = await submit(
      makeRequest(
        { ...validInput, website: "https://spam.example" },
        { enhanced: true },
      ),
      send,
    );

    expect(response.status).toBe(HTTP_OK);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("escapes user content in the HTML email", async () => {
    let sentEmail: SendEmailOptions | undefined;
    const send: FeedbackSendEmail = async (options) => {
      sentEmail = options;
    };
    await submit(
      makeRequest({
        email: validInput.email,
        message: "<script>alert('nope')</script>",
      }),
      send,
    );

    expect(sentEmail?.html).toContain(
      "&lt;script&gt;alert(&#039;nope&#039;)&lt;/script&gt;",
    );
    expect(sentEmail?.html).not.toContain("<script>");
  });

  it("returns a generic enhanced failure when email delivery fails", async () => {
    const response = await submit(
      makeRequest(validInput, { enhanced: true }),
      async () => {
        throw new Error("Resend leaked detail");
      },
    );

    expect(response.status).toBe(HTTP_BAD_GATEWAY);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message:
        "We couldn't send your feedback. Please try again or email us directly.",
    });
  });

  it("rejects an explicitly cross-site request", async () => {
    const send = vi.fn();
    const response = await submit(
      makeRequest(validInput, {
        enhanced: true,
        origin: "https://attacker.example",
      }),
      send,
    );

    expect(response.status).toBe(HTTP_FORBIDDEN);
    expect(send).not.toHaveBeenCalled();
  });
});
