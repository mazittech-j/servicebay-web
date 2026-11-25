CREATE TABLE servicebay_records (
  key TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated TEXT NOT NULL
);
