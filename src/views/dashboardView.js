import { db } from "../db/index.js";

function parseServerDate(str) {
  const [datePart, timePart] = str.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);

  return new Date(Date.UTC(year, month - 1, day, hour, minute, second))
    .toLocaleString([], {
      dateStyle: "long",
      timeStyle: "short"
    });
}

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

    const players = await db.all(`
      SELECT * FROM players
    `);

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
            input, select{padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;max-width:360px;margin-top:6px}
            button{margin-top:12px;padding:8px 12px;border-radius:6px;border:none;background:#2563eb;color:#fff;cursor:pointer}
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
          <link rel="manifest" href="/site.webmanifest">
        </head>
        <body>
          <h1>🏀 Wednesday Night Basketball</h1>
          <h2>${game.date || "(no date)"} @ ${game.location || "(no location)"}</h2>
          <hr>

          <div class="respond" id="respond">
            <h3>Make/Change RSVP</h3>
            <form id="rsvpForm">
              <label>Select Player:
                <select id="rsvpPlayerSelect">
                  ${players.map(p => `<option value="${p.email}">${p.name} (${p.email})</option>`).join("")}
                </select>
              </label>
              <br>
              <label>Select Response:
                <select id="rsvpResponseSelect">
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="maybe">Maybe</option>
                </select>
              </label>
              <br><button type="submit" id="rsvpSubmit">Submit RSVP</button>
            </form>
          </div>
          <hr>

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
                <td>${parseServerDate(r.updatedAt) || ""}</td>
              </tr>`).join("")}
          </table>

          <p style="margin-top:2rem;font-size:0.9rem;color:#888;">
            Auto-refreshes every 30 seconds.
          </p>
          <script src="/pickup/static/dashboard.js"></script>
        </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading dashboard");
  }
}
