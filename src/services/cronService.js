import dotenv from "dotenv";
dotenv.config();
import { db } from "../db/index.js";
import { sendMail } from "../services/emailService.js";
import cron from "node-cron";

cron.schedule(process.env.REMINDER_CRON_SCHEDULE, async () => { 
  console.log("Running Tuesday attendance summary check...");
  await sendSummaryEmail();
});

async function sendSummaryEmail() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const iso = tomorrow.toISOString().slice(0, 10) + "%";

  // Check for a game tomorrow
  const game = await db.get(`
    SELECT id, date_iso, location
    FROM games
    WHERE date_iso LIKE ?
    ORDER BY date_iso LIMIT 1
  `, [iso]);

  if (!game) {
    console.log("No Wednesday game found — skipping summary email.");
    return;
  }

  console.log("Wednesday game found:", game);

  const time = game.date_iso.slice(11,16);

  // Fetch responses for that game
  const rows = await db.all(`
    SELECT p.name, p.email, COALESCE(r.status, 'no response') AS response
    FROM players p
    LEFT JOIN responses r 
      ON p.id = r.playerId AND r.gameId = ?
  `, [game.id]);

  const groups = {
    yes: rows.filter(r => r.response === "yes").map(r => r.name),
    maybe: rows.filter(r => r.response === "maybe").map(r => r.name),
    no: rows.filter(r => r.response === "no").map(r => r.name),
    none: rows.filter(r => r.response === "no response").map(r => r.name)
  };

  const formatList = (arr) => arr.length ? arr.join(", ") : "—";

  const subject = `Tomorrow's Basketball: Attendance Summary`;

  const textBody = `
Tomorrow's Basketball Game!

Manage attendance:
${process.env.BASE_URL}/pickup/dashboard

Location: ${game.location}
Time: ${time}

COMING (${groups.yes.length})
${formatList(groups.yes)}

MAYBE (${groups.maybe.length})
${formatList(groups.maybe)}

NOT COMING (${groups.no.length})
${formatList(groups.no)}

NO RESPONSE (${groups.none.length})
${formatList(groups.none)}
`;

  // HTML Email
  const htmlBody = `
  <div style="font-family: Arial, sans-serif; padding: 16px; font-size: 15px; color: #222; line-height: 1.5;">
    <h2 style="margin-bottom: 4px;">🏀 Tomorrow's Basketball Game</h2>
    <p style="margin: 0 0 12px 0;"><strong>📍 Location:</strong> ${game.location}<br>
    <strong>⏰ Time:</strong> ${time}</p>

    <div style="margin-bottom: 16px;">
      <h3 style="color: #2e7d32; margin-bottom: 4px;">✔ Coming (${groups.yes.length})</h3>
      <p style="margin: 0 0 10px 0;">${formatList(groups.yes)}</p>

      <h3 style="color: #f57c00; margin-bottom: 4px;">❓ Maybe (${groups.maybe.length})</h3>
      <p style="margin: 0 0 10px 0;">${formatList(groups.maybe)}</p>

      <h3 style="color: #c62828; margin-bottom: 4px;">❌ Not Coming (${groups.no.length})</h3>
      <p style="margin: 0 0 10px 0;">${formatList(groups.no)}</p>

      <h3 style="color: #6a6a6a; margin-bottom: 4px;">🤷 No Response (${groups.none.length})</h3>
      <p style="margin: 0;">${formatList(groups.none)}</p>
    </div>

    <p>
      <a href="${process.env.BASE_URL}/pickup/dashboard"
        style="display: inline-block; background: #1976d2; color: white; padding: 10px 16px; text-decoration: none; border-radius: 6px;">
        📋 Manage Attendance
      </a>
    </p>

    <p style="font-size: 12px; color: #888; margin-top: 20px;">
      This message was sent automatically on Tuesday evening if a game is scheduled for tomorrow.
    </p>
  </div>
  `;

  // Send to all players
  const allEmails = rows.map(r => r.email);
  await sendMail({ to: allEmails, subject, text: textBody, html: htmlBody });

  console.log(`Summary email sent to ${allEmails.length} players.`);
}
