import { db } from "../db/index.js";

export async function adminPage(req, res) {
  try {
    const players = await db.all(`SELECT name, email FROM players ORDER BY name ASC`);
    // Simple HTML page that uses client JS in /pickup/static/admin.js
    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Wednesday Basketball Admin Dashboard</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="/pickup/static/admin.css">
  <style>
    body{font-family:system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; padding:24px; max-width:800px; margin: auto; background:#f7fafc}
    .card{background:#fff;padding:16px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.06);margin-bottom:16px}
    label{display:block;margin-top:8px}
    input, select{padding:8px;border:1px solid #ddd;border-radius:6px;width:100%;max-width:360px;margin-top:6px}
    button{margin-top:12px;padding:8px 12px;border-radius:6px;border:none;background:#2563eb;color:#fff;cursor:pointer}
    button.danger{background:#d9534f}
    .response-message{margin-top:8px;min-height:1.2em}
    .response-message.success{color:#16a34a}
    .response-message.error{color:#dc2626}
    .create-btn:disabled { background-color: #93c5fd; cursor: not-allowed; opacity: 0.8; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <h1>🏀 Wednesday Basketball Admin Dashboard</h1>

    <div class="card" id="create-game-card">
    <h2>Create Game</h2>
    <form id="createGameForm">
      <label>Date</label>
      <input type="date" id="gameDate" required>
      <label>Time</label>
      <input type="time" id="gameTime" value="18:30" required>
      <label>Location</label>
      <input type="text" id="gameLocation" value="Franklin Elementary" placeholder="Gym or park" required>
      <br><button type="submit" id="createGameButton" class="create-btn">Create Game</button>
      <div id="createGameMessage" class="response-message"></div>
    </form>
  </div>

  <div class="card" id="add-player-card">
    <h2>Add Player</h2>
    <form id="addPlayerForm">
      <label>Name
      <input type="text" id="playerName" required></label>
      <label>Email
      <input type="email" id="playerEmail" required></label>
      <button type="submit">Add Player</button>
      <div id="addStatus" class="response-message"></div>
    </form>
  </div>

  <div class="card" id="remove-player-card">
    <h2>Remove Player</h2>
    <form id="removePlayerForm">
      <label>Select Player:
        <select id="removePlayerSelect">
          ${players.map(p => `<option value="${p.email}">${p.name} (${p.email})</option>`).join("")}
        </select>
      </label>
      <button type="submit" class="danger">Remove Player</button>
      <div id="removeStatus" class="response-message"></div>
    </form>
  </div>

  <script src="/pickup/static/admin.js"></script>
</body>
</html>
    `;
    res.send(html);
  } catch (err) {
    console.error("adminPage error", err);
    res.status(500).send("Error loading admin page");
  }
}
