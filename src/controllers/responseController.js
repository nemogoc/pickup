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

    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const existing = await db.get(`SELECT id, status FROM responses WHERE gameId = ? AND playerId = ?`, [gameId, playerId]);
    if (existing) {
      await db.run(`UPDATE responses SET status = ?, updatedAt = datetime('now') WHERE id = ?`, [status, existing.id]);
    } else {
      await db.run(`INSERT INTO responses (id, gameId, playerId, status, updatedAt) VALUES (?, ?, ?, ?, datetime('now'))`, [crypto.randomUUID(), gameId, playerId, status]);
    }

    await db.run(
    `
    INSERT INTO rsvp_logs (playerId, gameId, newResponse, priorResponse, ip)
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      playerId,
      gameId,
      status,
      existing ? existing.status : null,
      ip
    ]
  );

    console.log("📌 RSVP logged:", {
    player: playerId,
    newResponse: status,
    priorResponse: existing ? existing.status : "none",
    ip
      });

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
