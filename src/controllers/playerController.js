import crypto from "crypto";
import { db } from "../db/index.js";


/**
 * Accepts either single player object {name,email} or array of players.
 * Uses INSERT OR IGNORE to avoid duplicates by email.
 */
export async function addPlayer(req, res) {
  let players = req.body;

  if (!players) {
    return res.status(400).json({
      success: false,
      message: "Missing request body"
    });
  }
    
  // Handle single-player case
  if (!Array.isArray(players)) {
    players = [players];
  }

  // Validate all entries
  const invalid = players.find(p => !p.name || !p.email);
  if (invalid) {
    return res.status(400).json({
      success: false,
      message: "Each player must have a name and email"
    });
  }

  // Insert players (ignore duplicates by email)
  const stmt = await db.prepare(`
    INSERT OR IGNORE INTO players (id, name, email)
    VALUES (?, ?, ?)
  `);

  let insertedCount = 0;

  for (const player of players) {
    const result = await stmt.run(crypto.randomUUID(), player.name, player.email);
    if (result.changes > 0) insertedCount++; 
  }

  await stmt.finalize();

  return res.json({
    success: true,
    message: `${insertedCount} player(s) added`,
    count: insertedCount
  });
}

/**
 * Delete a player by email (and cleanup responses)
 */
export async function removePlayer(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Missing email"
    });
  }

  const player = await db.get(`SELECT * FROM players WHERE email = ?`, [email]);
  if (!player) {
    return res.status(404).json({
      success: false,
      message: "Player not found"
    });
  }

  await db.run(`DELETE FROM players WHERE email = ?`, [email]);
  await db.run(`DELETE FROM responses WHERE playerId = ?`, [player.id]);

  return res.json({
    success: true,
    message: `Removed player ${player.name}`,
    data: { email }
  });
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
