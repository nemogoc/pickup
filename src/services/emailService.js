import dotenv from "dotenv";
dotenv.config();

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMail(opts) {
  // opts: { to, subject, html, text, bcc, cc, etc. }
  console.log("sender", process.env.RESEND_EMAIL_FROM)
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_EMAIL_FROM,        // e.g. "You <you@yourdomain.com>"
      to: opts.to,                           // string or array of emails
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      cc: opts.cc,
      bcc: opts.bcc,
      // optionally more parameters...
    });

    if (error) {
      console.error("Resend send error:", error);
      throw new Error(`Resend error: ${error.message}`);
    }

    // data contains info about the sent email (id, etc.)
    console.log("Resend sent:", data);
    return data;
  } catch (err) {
    console.error("Failed to send via Resend:", err);
    throw err;
  }
}

// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS
//   }
// });

// // Verify only once at startup (not per email!)
// transporter.verify()
//   .then(() => console.log("📨 Mailer verified and ready"))
//   .catch(err => console.error("❌ Mailer verification failed", err));

// /**
//  * sendMail accepts { to, subject, text, html }
//  */
// export async function sendMail(opts) {
//   if (!process.env.EMAIL_USER) {
//     console.warn("EMAIL_USER not set; skipping actual sendMail in development.");
//     return Promise.resolve();
//   }

//   return transporter.sendMail({
//     from: {
//       name: process.env.EMAIL_USER_NAME,
//       address: process.env.EMAIL_USER
//     },
//     ...opts
//   });
// }
