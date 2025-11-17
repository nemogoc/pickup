import crypto from "crypto";
import { db } from "../db/index.js";

/**
 * GET /pickup/respond?gameId=...&playerId=...&status=yes
 * This records or updates the response
 */
export async function respond(req, res) {
  try {
    const { gameId, playerId, status } = req.query;
    if (!gameId || !playerId || !status) return res.status(400).send("Missing parameters");

    const existing = await db.get(`SELECT id FROM responses WHERE gameId = ? AND playerId = ?`, [gameId, playerId]);
    if (existing) {
      await db.run(`UPDATE responses SET status = ?, updatedAt = datetime('now') WHERE id = ?`, [status, existing.id]);
    } else {
      await db.run(`INSERT INTO responses (id, gameId, playerId, status, updatedAt) VALUES (?, ?, ?, ?, datetime('now'))`, [crypto.randomUUID(), gameId, playerId, status]);
    }

    // Render a small response page
    res.send(`
      <head>
      <meta http-equiv="refresh" content="3;url=/pickup/dashboard">
      </head>
      <body>  
      <h2>Thanks! Your response has been recorded as "${status}".</h2>
      </body>
    `);
  } catch (err) {
    console.error("respond error", err);
    res.status(500).send("Error recording response");
  }
}
