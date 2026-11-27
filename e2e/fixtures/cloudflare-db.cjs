'use strict';
// Node-only D1 binding for the Playwright server. Use the real schema and
// Better Auth session checks without reaching a live account or database.
const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const file = process.env.ROLEPATCH_E2E_DB_PATH;
const sqlite = new DatabaseSync(file);
sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
if (!sqlite.prepare("SELECT 1 FROM sqlite_master WHERE name = 'session'").get()) {
  const migrations = join(__dirname, '../../migrations');
  for (const migration of readdirSync(migrations).sort()) {
    if (migration.endsWith('.sql')) {
      sqlite.exec(readFileSync(join(migrations, migration), 'utf8'));
    }
  }
}

function prepare(sql, args = []) {
  const statement = sqlite.prepare(sql);
  return {
    bind: (...values) => prepare(sql, values),
    all: async () => {
      const results = statement.all(...args);
      return {
        results,
        meta: {
          changes: /^\s*SELECT\b/i.test(sql) ? 0 : sqlite.prepare('SELECT changes() AS n').get().n,
        },
      };
    },
    run: async () => {
      const { changes, lastInsertRowid } = statement.run(...args);
      return { meta: { changes, last_row_id: lastInsertRowid } };
    },
  };
}

globalThis[Symbol.for('__cloudflare-context__')] = {
  env: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    DB: { prepare, batch: (statements) => Promise.all(statements.map((stmt) => stmt.all())) },
  },
};
