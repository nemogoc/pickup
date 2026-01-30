import { db } from "../db/index.js";

function parseServerDate(str) {
  let formattedDate = new Date(str.replace(" ", "T") + "Z");
  return formattedDate.toLocaleString([], {
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
      SELECT 
        COALESCE(p.name, g.name) AS name,
        r.status,
        r.updatedAt,
        CASE 
          WHEN p.id IS NOT NULL THEN 'player'
          ELSE 'guest'
        END AS type
      FROM responses r
      LEFT JOIN players p ON r.playerId = p.id
      LEFT JOIN guests g ON r.playerId = g.id
      WHERE r.gameId = ?
      ORDER BY type DESC, name ASC;
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
<!DOCTYPE html>
<html>
<head>
  <title>Pickup Attendance</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="30">

  <style>
    :root {
      --bg: #f4f6f8;
      --card: #ffffff;
      --border: #e5e7eb;
      --accent: #2563eb;
    }

    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      margin: 0;
      padding: 1rem;
      color: #111;
    }

    header {
      text-align: center;
      margin-bottom: 1rem;
    }

    h1 {
      margin: 0;
      font-size: 1.6rem;
    }

    h2 {
      margin: 0.25rem 0 0;
      font-size: 1.1rem;
      font-weight: normal;
      color: #444;
    }

    main {
      max-width: 720px;
      margin: 0 auto;
      display: grid;
      gap: 1rem;
    }

    section {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem;
    }

    /* Summary */
    .summary {
      display: flex;
      justify-content: space-around;
      font-size: 1.1rem;
      font-weight: bold;
    }

    .yes { color: #15803d; }
    .no { color: #b91c1c; }
    .maybe { color: #d97706; }

    /* Attendance list */
    .list {
      display: grid;
      gap: 0.75rem;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.5rem;
    }

    .row:last-child {
      border-bottom: none;
    }

    .name {
      font-weight: 500;
    }

    .guest {
      font-style: italic;
      opacity: 0.75;
    }

    .updated {
      font-size: 0.75rem;
      color: #666;
    }

    /* Forms */
    form {
      display: grid;
      gap: 0.75rem;
    }

    label {
      font-size: 0.9rem;
      font-weight: 500;
    }

    input, select {
      width: 100%;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid var(--border);
      font-size: 1rem;
    }

    button {
      padding: 12px;
      border-radius: 10px;
      border: none;
      background: var(--accent);
      color: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }

    button:active {
      transform: scale(0.98);
    }

    footer {
      text-align: center;
      font-size: 0.75rem;
      color: #666;
      margin-top: 1rem;
    }
  </style>
</head>

<body>
  <header>
    <h1>🏀 Wednesday Night Basketball</h1>
    <h2>${game.date} @ ${game.location}</h2>
  </header>

  <main>

    <!-- Summary -->
    <section class="summary">
      <div class="yes">✅ ${counts.yes}</div>
      <div class="maybe">🤷 ${counts.maybe}</div>
      <div class="no">❌ ${counts.no}</div>
    </section>

    <!-- RSVP -->
    <section id="respond">
      <h3>Make / Change RSVP</h3>
      <form id="rsvpForm">
        <label>Player</label>
        <select id="rsvpPlayerSelect">
          ${players.map(p => `<option value="${p.email}">${p.name}</option>`).join("")}
        </select>

        <label>Response</label>
        <select id="rsvpResponseSelect">
          <option value="yes">Yes</option>
          <option value="maybe">Maybe</option>
          <option value="no">No</option>
        </select>

        <button type="submit" id="rsvpSubmit">Submit RSVP</button>
      </form>
    </section>

    <!-- Attendance -->
    <section>
      <h3>Who's Coming</h3>
      <div class="list">
        ${responses.map(r => `
          <div class="row">
            <div class="name ${r.type === 'guest' ? 'guest' : ''}">
              ${r.name}${r.type === 'guest' ? ' (guest)' : ''}
              <div class="updated">${parseServerDate(r.updatedAt)}</div>
            </div>
            <div class="${r.status}">${r.status}</div>
          </div>
        `).join("")}
      </div>
    </section>

    <!-- Guest -->
    <section>
      <h3>Guest RSVP</h3>
      <form id="guestForm">
        <label>Guest name</label>
        <input id="guestName">

        <label>Response</label>
        <select id="guestResponseSelect">
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>

        <label>Invited by (optional)</label>
        <input id="whoInvited">

        <button type="submit" id="guestSubmit">Submit Guest</button>
        <div id="guestStatus"></div>
      </form>
    </section>

  </main>

  <footer>
    Auto-refreshes every 30 seconds
  </footer>

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
