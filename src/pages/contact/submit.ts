import { handleFeedbackRequest } from "#/contact/feedback";
import { sendEmail } from "#/utils/sendEmail";
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) =>
  handleFeedbackRequest({
    request,
    user: locals.user,
    apiKey: env.RESEND_API_KEY,
    from: env.RESEND_FROM_EMAIL,
    send: sendEmail,
  });
