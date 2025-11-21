import crypto from "crypto";
import { db } from "../db/index.js";
import { sendMail } from "../services/emailService.js";

/**
 * create-game: accepts {date, time, location}
 * Stores `date` as a human-readable string in games.date and iso in date_iso.
 * Then sends invites to all players with unique RSVP links.
 */
export async function createGame(req, res) {
  try {
    const { date, time, location } = req.body;
    if (!date || !time || !location) return res.status(400).send("date, time, and location are required");

    const gameId = crypto.randomUUID();
    const human = formatDateTimeHuman(date, time);
    const iso = `${date}T${time}:00`;

    await db.run(
      `INSERT INTO games (id, date, date_iso, location) VALUES (?, ?, ?, ?)`,
      [gameId, human, iso, location]
    );

    // Send invitations
    const playersEmail = (await db.all(`SELECT email FROM players`))
      .map(p => p.email);
    const baseUrl = process.env.BASE_URL;
    const subject = `Basketball: ${human} at ${location}`;
    const statusLink = `${baseUrl}/pickup/dashboard`;

    if (playersEmail.length === 0) {
        return res.send("No players in database yet. Add players first.");
    }

    const html = `
        <p>Hey All,</p>
        <p>Next game is:</p>
        <p><strong>${human}</strong> at <strong>${location}</strong></p>
        <p>Can you make it?</p>
        <p>RSVP, change your RSVP, and see who else will be at the next game <a href="${statusLink}">here</a></p>
        <p>See you on the court!</p>
    `;

    await sendMail({ to: playersEmail, subject, html });

    res.json({ message: "Game created and invites sent", gameId, date: human, location });
  } catch (err) {
    console.error("createGame error", err);
    res.status(500).send("Error creating game");
  }
}

export async function currentGameId(req, res) {
  return res.send(await db.get(`
    SELECT id FROM games
    ORDER BY createdAt DESC
    LIMIT 1
  `));
}

/**
 * Accepts date "YYYY-MM-DD" and time "HH:MM" (24h) and returns a human friendly string.
 * Example: ("2025-11-11", "18:30") -> "Nov 11th at 6:30 PM"
 */
function formatDateTimeHuman(dateStr, timeStr) {
  const [hour, minute] = timeStr.split(":").map(Number);
  const gameDate = new Date(dateStr);
  gameDate.setHours(hour, minute);
  const options = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
  let formattedDate = new Intl.DateTimeFormat("en-US", options).format(gameDate);

  return formattedDate;
}
