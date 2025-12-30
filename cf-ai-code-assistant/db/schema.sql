/*
DROP TABLE sessions;
DROP TABLE messages;
*/

CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    session_name TEXT,
    assistant_name TEXT,
    programming_language TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role_name TEXT CHECK(role_name IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
