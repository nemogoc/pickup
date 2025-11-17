import dotenv from "dotenv";
dotenv.config();

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * sendMail accepts { to, subject, text, html }
 */
export async function sendMail(opts) {
  if (!process.env.EMAIL_USER) {
    console.warn("EMAIL_USER not set; skipping actual sendMail in development.");
    return;
  }

  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    ...opts
  });
}
