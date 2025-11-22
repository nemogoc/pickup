import dotenv from "dotenv";
dotenv.config();

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMail(opts) {
  // opts: { to, subject, html, text, bcc, cc, etc. }
  console.log("sender", process.env.RESEND_EMAIL_FROM)
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      cc: opts.cc,
      bcc: opts.bcc,
    });

    if (error) {
      console.error("Resend send error:", error);
      throw new Error(`Resend error: ${error.message}`);
    }

    console.log("Resend sent:", data);
    return data;
  } catch (err) {
    console.error("Failed to send via Resend:", err);
    throw err;
  }
}
