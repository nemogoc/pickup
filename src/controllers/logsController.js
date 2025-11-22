import { db } from "../db/index.js";

export async function getLogs(req, res) {
  const logs = await db.all(`
    SELECT 
      r.timestamp,
      r.playerId,
      p.name AS playerName,
      r.newResponse,
      r.priorResponse,
      r.gameId,
      r.ip
    FROM rsvp_logs r
    LEFT JOIN players p ON r.playerId = p.id
    ORDER BY r.timestamp DESC
    LIMIT 200
  `);

  res.json(logs);
};
