-- games table changes: add column date_iso. Add default value to createdAt of DEFAULT (datetime('now'))
BEGIN TRANSACTION;

-- 1. Create the new table with updated schema
CREATE TABLE games_new (
    id TEXT PRIMARY KEY,
    date TEXT,
    date_iso TEXT,
    location TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
);

-- 2. Copy old data
INSERT INTO games_new (id, date, date_iso, location, createdAt)
SELECT id, date, "0", location, createdAt
FROM games;

-- 3. Remove old table
DROP TABLE games;

-- 4. Rename new table
ALTER TABLE games_new RENAME TO games;

COMMIT;

-- responses table changes. Add UNIQUE (gameId, playerId) constraint
BEGIN TRANSACTION;

-- 1. Create the new table with updated schema
CREATE TABLE responses_new (
    id TEXT PRIMARY KEY,
    gameId TEXT,
    playerId TEXT,
    status TEXT,
    updatedAt TEXT,
    UNIQUE (gameId, playerId)
);

-- 2. Copy old data
INSERT INTO responses_new (id, gameId, playerId, status, updatedAt)
SELECT id, gameId, playerId, status, updatedAt
FROM responses;

-- 3. Remove old table
DROP TABLE responses;

-- 4. Rename new table
ALTER TABLE responses_new RENAME TO responses;

COMMIT;
