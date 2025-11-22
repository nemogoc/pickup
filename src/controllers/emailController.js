import { db } from "../db/index.js";
import { sendMail } from "../services/emailService.js";

export async function broadcastEmail(req, res) {
  const { subject, body } = req.body;

  if (!subject || !body) {
    return res.status(400).json({ error: "Missing subject or message" });
  }

  const playersEmail = (await db.all("SELECT email FROM players WHERE email IS NOT NULL"))
      .map(p => p.email);

  if (playersEmail.length === 0) {
    return res.status(404).json({ error: "No players found" });
  }

  await sendMail({
    to: playersEmail,
    subject,
    html: body,
    text: body
  });

  return res.json({ sent: playersEmail.length, message: "Emails sent!" });
}
