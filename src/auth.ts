import { db } from "#/db";
import * as schema from "#/schemas/chatDB-schema";
import { sendEmail } from "#/utils/sendEmail";
import { envOrDie } from "./utils/envOrDie";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { getOAuthState } from "better-auth/api";
import { emailOTP } from "better-auth/plugins";
import { waitUntil } from "cloudflare:workers";

// see
// https://github.com/better-auth/better-auth/issues/6766#issuecomment-3704724493
// and
// https://github.com/better-auth/better-auth/pull/6913
// for why we have a funny-lookin' adapter

const MIN_PROD_PASSWORD_LENGTH = 8;

const {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  RESEND_API_KEY,
  RESEND_FROM_EMAIL,
} = envOrDie([
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
]);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite", // or "pg" or "mysql"
    schema,
    usePlural: true,
  }),

  user: {
    changeEmail: {
      enabled: true,
    },
    additionalFields: {
      // this is used to sync up with the locally-generated UUID that we use for
      // anonymous users. When a user signs up, we want them to "retain
      // ownership" of their messages so we take the local UUID if any and add
      // it to the db.
      chatId: {
        type: "string",
        required: true,
        unique: true,
        input: true,
      },
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    requireEmailVerification: true,
    autoSignInAfterVerification: true,
    // Avoid awaiting to prevent timing attacks.
    sendVerificationEmail: async ({ user, url }) => {
      waitUntil(
        sendEmail({
          apiKey: RESEND_API_KEY,
          from: RESEND_FROM_EMAIL,
          to: user.email,
          subject: "Verify your Chat with Dice email address",
          html: verificationEmailHtml(url),
          text: `Verify your email address by visiting: ${url}`,
        }),
      );
    },
    // Avoid awaiting to prevent timing attacks.
    sendChangeEmailVerification: async ({
      newEmail,
      url,
    }: {
      newEmail: string;
      url: string;
      user: { email: string };
    }) => {
      waitUntil(
        sendEmail({
          apiKey: RESEND_API_KEY,
          from: RESEND_FROM_EMAIL,
          to: newEmail,
          subject: "Confirm your new Chat with Dice email address",
          html: changeEmailVerificationHtml(url),
          text: `Confirm your new email address by visiting: ${url}`,
        }),
      );
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: import.meta.env.DEV ? 0 : MIN_PROD_PASSWORD_LENGTH,
  },

  socialProviders: {
    github: {
      clientId: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    },
  },

  databaseHooks: {
    user: {
      create: {
        // https://better-auth.com/docs/concepts/oauth#accessing-additional-data-in-hooks
        // this is how we pass the client-provided chatId into the newly created
        // SSO user
        before: async (_user, ctx) => {
          if (ctx?.path === "/callback/:id") {
            const additionalData = await getOAuthState();
            if (additionalData?.chatId) {
              return {
                data: {
                  chatId: additionalData.chatId,
                },
              };
            }
          }
        },
      },
    },
  },

  plugins: [
    emailOTP({
      // Avoid awaiting to prevent timing attacks.
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (type === "forget-password") {
          waitUntil(
            sendEmail({
              apiKey: RESEND_API_KEY,
              from: RESEND_FROM_EMAIL,
              to: email,
              subject: "Your Chat with Dice password reset code",
              html: passwordResetEmailHtml(otp),
              text: `Your password reset code is: ${otp}\n\nIt expires in 5 minutes.`,
            }),
          );
        }
      },
    }),
  ],
});

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

function verificationEmailHtml(url: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;padding:40px;">
    <h1 style="margin:0 0 8px;font-size:24px;color:#1a1a1a;">Verify your email</h1>
    <p style="margin:0 0 24px;color:#555;">
      Thanks for signing up for <strong>Chat with Dice</strong>!
      Click the button below to verify your email address and activate your account.
    </p>
    <a href="${url}"
       style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;
              border-radius:6px;text-decoration:none;font-weight:600;">
      Verify email address
    </a>
    <p style="margin:24px 0 0;color:#999;font-size:13px;">
      Or copy this link into your browser:<br>
      <span style="color:#6366f1;word-break:break-all;">${url}</span>
    </p>
    <hr style="margin:32px 0;border:none;border-top:1px solid #eee;">
    <p style="margin:0;color:#bbb;font-size:12px;">
      If you didn't create an account you can safely ignore this email.
    </p>
  </div>
</body>
</html>`;
}

function changeEmailVerificationHtml(url: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;padding:40px;">
    <h1 style="margin:0 0 8px;font-size:24px;color:#1a1a1a;">Confirm your new email</h1>
    <p style="margin:0 0 24px;color:#555;">
      Someone requested an email address change on your <strong>Chat with Dice</strong> account.
      Click the button below to confirm this is your new address.
    </p>
    <a href="${url}"
       style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;
              border-radius:6px;text-decoration:none;font-weight:600;">
      Confirm new email address
    </a>
    <p style="margin:24px 0 0;color:#999;font-size:13px;">
      Or copy this link into your browser:<br>
      <span style="color:#6366f1;word-break:break-all;">${url}</span>
    </p>
    <hr style="margin:32px 0;border:none;border-top:1px solid #eee;">
    <p style="margin:0;color:#bbb;font-size:12px;">
      If you didn't request this change you can safely ignore this email.
    </p>
  </div>
</body>
</html>`;
}

function passwordResetEmailHtml(otp: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;padding:40px;">
    <h1 style="margin:0 0 8px;font-size:24px;color:#1a1a1a;">Password reset code</h1>
    <p style="margin:0 0 24px;color:#555;">
      Use the code below to reset your <strong>Chat with Dice</strong> password.
      It expires in <strong>5 minutes</strong>.
    </p>
    <div style="background:#f5f5f5;border-radius:8px;padding:28px;text-align:center;
                font-size:40px;font-weight:700;letter-spacing:0.3em;color:#1a1a1a;">
      ${otp}
    </div>
    <hr style="margin:32px 0;border:none;border-top:1px solid #eee;">
    <p style="margin:0;color:#bbb;font-size:12px;">
      If you didn't request a password reset you can safely ignore this email.
    </p>
  </div>
</body>
</html>`;
}

export type Session = (typeof auth.$Infer.Session)["session"];
export type User = (typeof auth.$Infer.Session)["user"];
