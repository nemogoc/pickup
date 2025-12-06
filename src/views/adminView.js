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
  <link rel="apple-touch-icon" sizes="180x180" href="/pickup/static/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/pickup/static/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/pickup/static/favicon-16x16.png">
  <link rel="manifest" href="/pickup/static/site.webmanifest">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
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
    <div class="card" id="edit-game-card">
      <h2>Edit Most Recent Game</h2>
      <form id="editGameForm">
        <label>Date:</label>
        <input type="text" id="editGameDate" class="flatpickr"/>

        <label>Time:</label>
        <input type="time" id="editGameTime"/>

        <label>Location:</label>
        <input type="text" id="editGameLocation"/>

        <button id="editGameButton" type="submit">Update Game</button>

        <p id="editGameMessage" class="response-message"></p>
      </form>
    </div>
    
    <div class="card" id="view-logs-card">
      <h2>Recent RSVP Logs</h2>
      <div id="logContainer" style="max-height:250px; overflow-y:auto; border:1px solid #ccc; padding:8px; background:#fafafa"></div>
    </div>
    
    <div class="card" id="send-email-card">
      <h2>📢 Send Email to All Players</h2>

      <form id="broadcastEmailForm">
        <label>Subject:</label><br>
        <input type="text" id="broadcastSubject" required style="width:300px;"><br><br>

        <label>Message:</label><br>
        <textarea id="broadcastBody" rows="6" style="width:300px;" required></textarea><br><br>

        <button type="submit" id="broadcastSendBtn">Send Email</button>
        <div id="broadcastStatus" style="margin-top:10px; font-weight: bold;"></div>
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
