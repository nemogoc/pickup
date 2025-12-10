import dotenv from "dotenv";
dotenv.config();

import { db } from "../db/index.js";
import { sendMail } from "../services/emailService.js";
import cron from "node-cron";
import { DateTime } from "luxon";

cron.schedule(process.env.REMINDER_CRON_SCHEDULE, async () => { 
  console.log("Running Tuesday attendance summary check...");
  await sendSummaryEmail();
});

export async function sendSummaryEmail() {
  const tomorrow = DateTime.now().setZone("America/Chicago").plus({ days:1 });
 
  const isoPrefix = tomorrow.toISODate() + "%";

  // Check for a game tomorrow
  const game = await db.get(`
    SELECT id, date_iso, location
    FROM games
    WHERE date_iso LIKE ?
    ORDER BY date_iso LIMIT 1
  `, [isoPrefix]);

  if (!game) {
    console.log("No Wednesday game found — skipping summary email.");
    return;
  }

  console.log("Wednesday game found:", game);

  const time = game.date_iso.slice(11,16);

  // Fetch player responses
  const playerRows = await db.all(
    `
    SELECT p.name, p.email, COALESCE(r.status, 'no response') AS response
    FROM players p
    LEFT JOIN responses r 
      ON p.id = r.playerId AND r.gameId = ?
  `,
    [game.id]
  );

  // Fetch guest responses
  const guestRows = await db.all(`
    SELECT g.name, r.status as response
    FROM guests g
    LEFT JOIN responses r 
      ON g.id = r.playerId AND r.gameId = ?
    WHERE response IN ('yes', 'maybe', 'no')
  `, [game.id]);


  // Groups: YES, MAYBE, NO, NO RESPONSE
  const groups = {
    yes: [],
    maybe: [],
    no: [],
    none: []
  };

  function addToGroups(row) {
    switch (row.response) {
      case "yes": groups.yes.push(row.name); break;
      case "maybe": groups.maybe.push(row.name); break;
      case "no": groups.no.push(row.name); break;
      default: groups.none.push(row.name); break;
    }
  }

  // Add players + guests
  playerRows.forEach(addToGroups);
  guestRows.forEach(addToGroups);

  const formatList = arr => (arr.length ? arr.join(", ") : "—");

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

  // Send to all players
  const allEmails = playerRows.map(r => r.email);
  await sendMail({ to: allEmails, subject, text: textBody });

  console.log(`Summary email sent to ${allEmails.length} players.`);
}
