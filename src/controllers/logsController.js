import { db } from "../db/index.js";

export async function getLogs(req, res) {
  const logs = await db.all(`
    WITH latest AS (
      SELECT gameId
      FROM rsvp_logs
      ORDER BY timestamp DESC
      LIMIT 1
    )
    SELECT 
      r.timestamp,
      r.playerId,
      COALESCE(p.name, g.name) AS playerName,
      CASE 
        WHEN p.id IS NOT NULL THEN 'player'
        ELSE 'guest'
      END AS type,
      r.newResponse,
      r.priorResponse,
      r.gameId,
      r.ip
    FROM rsvp_logs r
    JOIN latest l ON r.gameId = l.gameId
    LEFT JOIN players p ON r.playerId = p.id
    LEFT JOIN guests g ON r.playerId = g.id
    ORDER BY r.timestamp DESC
    LIMIT 200
  `);

  res.json(logs);
};
