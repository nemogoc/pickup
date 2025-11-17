import crypto from "crypto";
import { db } from "../db/index.js";


/**
 * Accepts either single player object {name,email} or array of players.
 * Uses INSERT OR IGNORE to avoid duplicates by email.
 */
export async function addPlayer(req, res) {
  let players = req.body;

  if (!players) return res.status(400).send("Missing request body");

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
}

// Accepts player email
export async function removePlayer(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).send("Missing email");

  const player = await db.get(`SELECT * FROM players WHERE email = ?`, [email]);
  if (!player) return res.status(404).send("Player not found");

  await db.run(`DELETE FROM players WHERE email = ?`, [email]);

  // clean up any responses from this player
  await db.run(`DELETE FROM responses WHERE playerId = ?`, [player.id]);

  res.send(`Removed player ${player.name} (${email})`);
}

export async function getPlayerId(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).send("Missing email");

  const player = await db.get(`
    SELECT id FROM players
    WHERE email = ?
  `, [email]);
  if (!player) return res.status(404).send("Player not found");

  res.send(player);
}
