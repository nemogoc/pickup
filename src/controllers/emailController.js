import { db } from "../db/index.js";
import { sendMail } from "../services/emailService.js";

export async function broadcastEmail(req, res) {
  const { subject, body } = req.body;

  if (!subject || !body) {
    return res.status(400).json({ error: "Missing subject or message" });
  }

  const players = await db.all("SELECT email FROM players WHERE email IS NOT NULL");

  console.log("players length result:", players.length);
  if (players.length === 0) {
    return res.status(404).json({ error: "No players found" });
  }

  // Send emails in parallel
await Promise.all(
  players.map(async (p) => {
    try {
      await sendMail({
        to: p.email,
        subject,
        html: body,
        text: body
      });
    } catch (err) {
      console.error("Failed to send to", p.email, err);
    }
  })
);

  console.log("Broadcast result:", players.length);

  return res.json({ sent: players.length, message: "Emails sent!" });
}
