import { db } from "../db/index.js";
import { sendMail } from "../services/emailService.js";

export async function broadcastEmail(req, res) {
  const { subject, body } = req.body;

  if (!subject || !body) {
    return res.status(400).json({ error: "Missing subject or message" });
  }

  const players = await db.all("SELECT email FROM players WHERE email IS NOT NULL");

  if (players.length === 0) {
    return res.status(404).json({ error: "No players found" });
  }

  const playersEmail = [];

  for (const p of players) {
    playersEmail.push(p.email);
  }

  await sendMail({
        to: playersEmail,
        subject,
        html: body,
        text: body
  });

  return res.json({ sent: players.length, message: "Emails sent!" });
}
