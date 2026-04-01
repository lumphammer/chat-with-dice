export interface SendEmailOptions {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({
  apiKey,
  from,
  to,
  subject,
  html,
  text,
}: SendEmailOptions): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }
}
