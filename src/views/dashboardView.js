import { db } from "../db/index.js";

export async function dashboardPage(req, res) {
  try {
    // Get the most recent game
    const game = await db.get(`
      SELECT * FROM games
      ORDER BY createdAt DESC
      LIMIT 1
    `);
    if (!game) {
      return res.send("<h2>No games found.</h2>");
    }

    // Get all responses for that game, joined with player names
    const responses = await db.all(`
      SELECT p.name, r.status, r.updatedAt
      FROM responses r
      JOIN players p ON r.playerId = p.id
      WHERE r.gameId = ?
      ORDER BY p.name ASC
    `, [game.id]);

    // Count yes/maybe/no
    const counts = { yes: 0, no: 0, maybe: 0 };
    for (const r of responses) {
      if (r.status in counts) counts[r.status]++;
    }


    // Render a simple dashboard
    const html = `
      <html>
        <head>
          <title>Pickup Attendance Dashboard</title>
          <meta http-equiv="refresh" content="30">
          <style>
            body { font-family: sans-serif; background: #fafafa; padding: 2rem; }
            h1 { color: #333; }
            table { border-collapse: collapse; margin-top: 1rem; width: 100%; max-width: 600px; }
            th, td { padding: 8px 12px; border-bottom: 1px solid #ddd; text-align: left; }
            .yes { color: green; font-weight: bold; }
            .no { color: red; font-weight: bold; }
            .maybe { color: orange; font-weight: bold; }
            .summary { margin: 1rem 0; font-size: 1.1rem; }
          </style>
        </head>
        <body>
          <h1>🏀 Wednesday Night Basketball</h1>
          <h2>${game.date || "(no date)"} @ ${game.location || "(no location)"}</h2>

          <div class="summary">
            ✅ Yes: ${counts.yes} &nbsp; | &nbsp;
            ❌ No: ${counts.no} &nbsp; | &nbsp;
            🤷‍♂️ Maybe: ${counts.maybe}
          </div>

          <table>
            <tr><th>Player</th><th>Status</th><th>Updated</th></tr>
            ${responses.map(r => `
              <tr>
                <td>${r.name}</td>
                <td class="${r.status}">${r.status}</td>
                <td>${r.updatedAt || ""}</td>
              </tr>`).join("")}
          </table>

          <p style="margin-top:2rem;font-size:0.9rem;color:#888;">
            Auto-refreshes every 30 seconds.
          </p>
        </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading dashboard");
  }
}
