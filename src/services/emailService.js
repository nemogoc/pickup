import dotenv from "dotenv";
dotenv.config();

import nodemailer from "nodemailer";

console.log("EMAIL CONFIG CHECK", {
  GMAIL_USER: process.env.GMAIL_USER,
  HAS_PASSWORD: !!process.env.GMAIL_APP_PASSWORD,
  EMAIL_FROM: process.env.GMAIL_EMAIL_FROM,
});

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true = SSL
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * opts: {
 *   to: string | string[],
 *   subject: string,
 *   html?: string,
 *   text?: string,
 *   cc?: string | string[],
 *   bcc?: string | string[]
 * }
 */
export async function sendMail(opts) {
  try {
    const info = await transporter.sendMail({
      from: process.env.GMAIL_EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      cc: opts.cc,
      bcc: opts.bcc,
    });

    console.log("Gmail sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("Failed to send email via Gmail:", err);
    throw err;
  }
}
