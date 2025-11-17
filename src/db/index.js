import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

const DB_FILE = process.env.DB_FILE || path.join(process.cwd(), "attendance.db");

export async function initDb() {
  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        date TEXT,
        date_iso TEXT,
        location TEXT,
        createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS responses (
        id TEXT PRIMARY KEY,
        gameId TEXT,
        playerId TEXT,
        status TEXT,
        updatedAt TEXT,
        UNIQUE (gameId, playerId)
    );

    CREATE INDEX IF NOT EXISTS idx_responses_game ON responses (gameId);
  `);
}

export const db = await open({
  filename: DB_FILE,
  driver: sqlite3.Database,
});
