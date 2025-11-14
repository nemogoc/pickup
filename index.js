import express from "express";
import nodemailer from "nodemailer";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { v4 as uuid } from "uuid";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database setup
const db = await open({
  filename: './attendance.db',
  driver: sqlite3.Database
});

await db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  );
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    date TEXT,
    location TEXT,
    createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    gameId TEXT,
    playerId TEXT,
    status TEXT,
    updatedAt TEXT
  );
`);

const pickupRouter = express.Router();

// Email setup (Gmail or SendGrid)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ✅ CREATE GAME route
pickupRouter.post("/create-game", async (req, res) => {
  const baseUrl = process.env.BASE_URL;
  const { date, time, location } = req.body;
  if (!date || !time || !location) {
    return res.status(400).send("Date, time, and location are required");
  }  

  // Combine date and time into a single Date object
  const [hour, minute] = time.split(":").map(Number);
  const gameDate = new Date(date);
  gameDate.setHours(hour, minute);
  const options = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
  let formattedDate = new Intl.DateTimeFormat("en-US", options).format(gameDate);

  const gameId = uuid();
  await db.run(`INSERT INTO games (id, date, location, createdAt) VALUES (?, ?, ?, datetime('now'))`, [gameId, formattedDate, location]);

  const players = await db.all(`SELECT * FROM players`);
  if (players.length === 0) {
    return res.send("No players in database yet. Add players first.");
  }

  // Send each player their unique RSVP links
  for (const player of players) {
    const yesLink = `${baseUrl}/pickup/respond?gameId=${gameId}&playerId=${player.id}&status=yes`;
    const noLink = `${baseUrl}/pickup/respond?gameId=${gameId}&playerId=${player.id}&status=no`;
    const maybeLink = `${baseUrl}/pickup/respond?gameId=${gameId}&playerId=${player.id}&status=maybe`;
    const statusLink = `${baseUrl}/pickup/dashboard`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: player.email,
      subject: `Wednesday Basketball: ${formattedDate} at ${location}`,
      text: `
Hey ${player.name},

Next game is ${formattedDate} at ${location}. Can you make it?

✅ Yes: ${yesLink}
❌ No: ${noLink}
🤷‍♂️ Maybe: ${maybeLink}

(You can always change your status by clicking a different link)

You can always see else will be at the next game at this link
${statusLink}

See you on the court!`
    });
  }

  res.send(`Game created and invites sent to ${players.length} players.`);
});

pickupRouter.post("/resend-game", async (req, res) => {
  try {  
    // Get most recent game
    const game = await db.get(`
      SELECT * FROM games
      ORDER BY createdAt DESC
      LIMIT 1
    `);

    if (!game) {
      return res.status(404).send("No games found");
    }

    const gameId = game.id;

    const baseUrl = process.env.BASE_URL;
    const statusLink = `${baseUrl}/pickup/dashboard`;

    // Get all players
    const players = await db.all(`SELECT * FROM players`);

    // Resend each player their unique RSVP links
    for (const player of players) {
      const yesLink = `${baseUrl}/pickup/respond?gameId=${gameId}&playerId=${player.id}&status=yes`;
      const noLink = `${baseUrl}/pickup/respond?gameId=${gameId}&playerId=${player.id}&status=no`;
      const maybeLink = `${baseUrl}/pickup/respond?gameId=${gameId}&playerId=${player.id}&status=maybe`;


      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: player.email,
        subject: `Wednesday Pickup Basketball`,
        text: `
Next game is ${game.date} at ${game.location}. Can you make it?

✅ Yes: ${yesLink}
❌ No: ${noLink}
🤷‍♂️ Maybe: ${maybeLink}

(You can always change your status by clicking a different link)

You can always see who else will be at the next game at this link
${statusLink}

See you on the court!`
    });
  }
    res.send({ message: "✅ Game email resent successfully", game });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error resending game email");
  }
});

// Add player route
pickupRouter.post("/add-player", async (req, res) => {
  let players = req.body;

  // Handle single-player case
  if (!Array.isArray(players)) {
    players = [players];
  }

  // Validate all entries
  const invalid = players.find(p => !p.name || !p.email);
  if (invalid) {
    return res.status(400).send("Each player must have a name and email");
  }

  // Insert players (ignore duplicates by email)
  const stmt = await db.prepare(`
    INSERT OR IGNORE INTO players (id, name, email)
    VALUES (?, ?, ?)
  `);

  for (const player of players) {
    await stmt.run(crypto.randomUUID(), player.name, player.email);
  }

  await stmt.finalize();

  res.send(`${players.length} player(s) added successfully.`);
});

// ✅ REMOVE PLAYER route
pickupRouter.delete("/remove-player", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send("Missing email");

  const player = await db.get(`SELECT * FROM players WHERE email = ?`, [email]);
  if (!player) return res.status(404).send("Player not found");

  await db.run(`DELETE FROM players WHERE email = ?`, [email]);

  // Optional: clean up any responses from this player
  await db.run(`DELETE FROM responses WHERE playerId = ?`, [player.id]);

  res.send(`Removed player ${player.name} (${email})`);
});


// ✅ RESPOND route
pickupRouter.get("/respond", async (req, res) => {
  let { gameId, playerId, status } = req.query;
  if (!gameId || !playerId || !status) return res.status(400).send("Missing parameters");

  //TODO: remove this line and change the let above to const
  if(gameId == "230aa378-9a39-4f54-9e67-75dc3537be06") { gameId = "f8f265e3-a919-4208-aaf7-c27bcb88f8f1"; }

  const game = await db.get(`SELECT * FROM games WHERE id = ?`, [gameId]);
  
  // Check if this player already responded
  const existing = await db.get(
    `SELECT id FROM responses WHERE gameId = ? AND playerId = ?`,
    [gameId, playerId]
  );

  if (existing) {
    // Update existing response
    await db.run(
      `UPDATE responses
      SET status = ?, updatedAt = datetime('now')
      WHERE id = ?`,
      [status, existing.id]
    );
  } else {
    // Insert new response
    await db.run(
      `INSERT INTO responses (id, gameId, playerId, status, updatedAt)
      VALUES (?, ?, ?, ?, datetime('now'))`,
      [uuid(), gameId, playerId, status]
    );
  }

  const responses = await db.all(`
    SELECT players.name, responses.status
    FROM responses
    JOIN players ON players.id = responses.playerId
    WHERE gameId = ?
  `, [gameId]);

  const yesCount = responses.filter(r => r.status === "yes").length;
  const attendanceList = responses.map(r => `${r.name}: ${r.status}`).join("\n");

  // const allPlayers = await db.all(`SELECT email FROM players`);
  // const toList = allPlayers.map(p => p.email).join(", ");

  // await transporter.sendMail({
  //   from: process.env.EMAIL_USER,
  //   to: toList,
  //   subject: `Pickup Basketball: ${game.date} at ${game.location}`,
  //   text: `Updated attendance:\n\n${attendanceList}\nTotal attending: ${yesCount}`
  // });

  res.send(`<h2>Thanks! Your response has been recorded as "${status}".</h2>
            <p>Current attendance:</p>
            <pre>${attendanceList}</pre>
            <pre>Total: ${yesCount}`);
});


pickupRouter.get("/dashboard", async (req, res) => {
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
});


pickupRouter.get("/admin", async (req, res) => {
  try {
    const players = await db.all("SELECT name, email FROM players ORDER BY name ASC");

    const html = `
      <html>
        <head>
          <title>Wednesday Basketball Admin Dashboard</title>
          <style>
            body {
              font-family: system-ui, sans-serif;
              background: #f7f7f7;
              padding: 2rem;
              max-width: 800px;
              margin: auto;
            }
            h1, h2 { color: #333; }
            form {
              background: #fff;
              border-radius: 8px;
              padding: 1rem 1.5rem;
              box-shadow: 0 2px 6px rgba(0,0,0,0.1);
              margin-bottom: 2rem;
            }
            label { display: block; margin-top: 0.5rem; }
            input, select {
              margin-top: 0.25rem;
              padding: 0.5rem;
              width: 100%;
              max-width: 300px;
              border-radius: 4px;
              border: 1px solid #ccc;
            }
            button {
              margin-top: 1rem;
              background: #0077cc;
              color: white;
              border: none;
              border-radius: 4px;
              padding: 0.5rem 1rem;
              cursor: pointer;
            }
            .create-btn {
              background-color: #2563eb;
              color: white;
              border: none;
              padding: 0.6rem 1.2rem;
              border-radius: 8px;
              font-size: 1rem;
              cursor: pointer;
              transition: background-color 0.3s, opacity 0.3s;
              display: flex;
              align-items: center;
              gap: 0.5rem;
            }

            .create-btn:disabled {
              background-color: #93c5fd;
              cursor: not-allowed;
              opacity: 0.8;
            }

            .spinner {
              border: 3px solid rgba(255, 255, 255, 0.3);
              border-top: 3px solid white;
              border-radius: 50%;
              width: 16px;
              height: 16px;
              animation: spin 1s linear infinite;
            }

            @keyframes spin {
              to {
                transform: rotate(360deg);
            }
            button:hover { background: #005fa3; }
            .danger { background: #d33; }
            .danger:hover { background: #b22; }
            .status { margin-top: 1rem; font-size: 0.9rem; color: green; }

            .status.success {
              color: #16a34a; /* green */
            }

            .status.error {
              color: #dc2626; /* red */
            }
          </style>
        </head>
        <body>
          <h1>🏀 Wednesday Basketball Admin Dashboard</h1>

          <!-- Create Game -->
          <form id="createGameForm">
            <h2>Create New Game</h2>
            <label>Date:</label>
            <input type="date" id="gameDate" required />
            <label>Time:</label>
            <input type="time" id="gameTime" value="18:30" required />
            <label>Location:</label>
            <input type="text" id="gameLocation" placeholder="Gym name or park" value="Franklin Elementary" required />
            <button type="submit" id="createGameButton" class="create-btn">Create Game</button>
            <div id="gameStatus" class="status"></div>
          </form>

          <!-- Resend Game Email -->
          <form id="resendGameForm">
            <h2>Resend Game Email</h2>
            <p>Click below to resend the invitation for the most recent game.</p>
            <button type="submit">Resend Last Game Email</button>
            <div id="resendStatus" class="status"></div>
          </form>

          <!-- Add Player -->
          <form id="addPlayerForm">
            <h2>Add Player</h2>
            <label>Name:</label>
            <input type="text" id="playerName" required />
            <label>Email:</label>
            <input type="email" id="playerEmail" required />
            <button type="submit">Add Player</button>
            <div id="addStatus" class="status"></div>
          </form>

          <!-- Remove Player -->
          <form id="removePlayerForm">
            <h2>Remove Player</h2>
            <label>Select Player:</label>
            <select id="removePlayerSelect">
              ${players.map(p => `<option value="${p.email}">${p.name} (${p.email})</option>`).join("")}
            </select>
            <button type="submit" class="danger">Remove Player</button>
            <div id="removeStatus" class="status"></div>
          </form>

          <script>
            // Handle Add Player
            document.getElementById("addPlayerForm").addEventListener("submit", async (e) => {
              e.preventDefault();
              const name = document.getElementById("playerName").value.trim();
              const email = document.getElementById("playerEmail").value.trim();

              const res = await fetch("/pickup/add-player", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email }),
              });

              const msg = res.ok ? "✅ Player added!" : "❌ Failed to add player.";
              document.getElementById("addStatus").innerText = msg;
            });

            // Handle Remove Player
            document.getElementById("removePlayerForm").addEventListener("submit", async (e) => {
              e.preventDefault();
              const email = document.getElementById("removePlayerSelect").value;

              const res = await fetch("/pickup/remove-player", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
              });

              const msg = res.ok ? "✅ Player removed!" : "❌ Failed to remove player.";
              document.getElementById("removeStatus").innerText = msg;
            });

            // Handle Create Game
            document.getElementById("createGameForm").addEventListener("submit", async (e) => {
              e.preventDefault();

              const button = document.getElementById("createGameButton");
              const msgBox = document.getElementById("gameStatus");
              const date = document.getElementById("gameDate").value;
              const time = document.getElementById("gameTime").value;
              const location = document.getElementById("gameLocation").value.trim();

              msgBox.textContent = "";
              msgBox.className = "status";

              // Disable the button and show spinner
              button.disabled = true;
              button.innerHTML = \`<div class="spinner"></div> Creating game...\`;

              try {
                const response = await fetch("/pickup/create-game", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ date, time, location }),
                });

                if (response.ok) {
                  msgBox.textContent = "✅ Game created and emails sent!";
                  msgBox.classList.add("success")
                } else {
                  const msg = await response.text();
                  msgBox.textContent = \`Failed to create game: \${msg || response.statusText}\`;
                  msgBox.classList.add("error")
                }
              } catch (err) {
                console.error("Error creating game:", err);
                msgBox.textContent = "⚠️ Network or server error while creating the game.";
                msgBox.classList.add("error");
              } finally {
                // Re-enable the button after the request finishes
                button.disabled = false;
                button.innerHTML = "Create Game";
              }
            });

            // Handle Resend Game Email
            document.getElementById("resendGameForm").addEventListener("submit", async (e) => {
              e.preventDefault();
              const res = await fetch("/pickup/resend-game", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              });

              const msg = res.ok
                ? "✅ Game email resent successfully!"
                : "❌ Failed to resend game email.";
              document.getElementById("resendStatus").innerText = msg;
            });
          </script>
        </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading admin dashboard");
  }
});

app.use("/pickup", pickupRouter);

const PORT = process.env.PORT || 10598;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
