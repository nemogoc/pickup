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
    const players = await db.all(`SELECT * FROM players`);
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const subject = `Basketball: ${human} at ${location}`;
    const statusLink = `${baseUrl}/pickup/dashboard`;

    if (players.length === 0) {
        return res.send("No players in database yet. Add players first.");
    }

    for (const p of players) {
      // Build yes/no links using playerId and gameId
      const yesLink = `${baseUrl}/pickup/respond?gameId=${encodeURIComponent(gameId)}&playerId=${encodeURIComponent(p.id)}&status=yes`;
      const noLink = `${baseUrl}/pickup/respond?gameId=${encodeURIComponent(gameId)}&playerId=${encodeURIComponent(p.id)}&status=no`;
      const maybeLink = `${baseUrl}/pickup/respond?gameId=${encodeURIComponent(gameId)}&playerId=${encodeURIComponent(p.id)}&status=maybe`;

      const html = `
        <p>Hey${' ' + p.name || ""},</p>
        <p>Next game is:</p>
        <p><strong>${human}</strong> at <strong>${location}</strong></p>
        <p>Can you make it?</p>
        <p><a href="${yesLink}">✅ Yes</a><br><a href="${noLink}">❌ No</a><br><a href="${maybeLink}">🤷‍♂️ Maybe</a></p>
        <p>You can always change your status by clicking a different link</p>
        <p>You can always see who else will be at the next game <a href="${statusLink}">here</a></p>
        <p>See you on the court!</p>
      `;

      // sendMail allows skipping in development if no EMAIL_USER set
      await sendMail({ to: p.email, subject, html });
    }

    res.json({ message: "Game created and invites sent", gameId, date: human, location });
  } catch (err) {
    console.error("createGame error", err);
    res.status(500).send("Error creating game");
  }
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
