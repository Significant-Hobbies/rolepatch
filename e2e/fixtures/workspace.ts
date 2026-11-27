import { test as base } from '@playwright/test';
import { createHmac, randomUUID } from 'node:crypto';
type SqlValue = string | number | bigint | null;
type Row = Record<string, SqlValue>;

const { DatabaseSync } = process.getBuiltinModule('node:sqlite') as {
  DatabaseSync: new (
    path: string
  ) => {
    exec(sql: string): void;
    prepare(sql: string): {
      run(...values: SqlValue[]): void;
      all(...values: SqlValue[]): Row[];
    };
    close(): void;
  };
};

export type WorkspaceFixture = {
  userId: string;
  signIn: (expiresAt?: Date) => Promise<void>;
  query: (sql: string, ...values: SqlValue[]) => Row[];
  seedResume: (source: string, name?: string) => string;
};

export const test = base.extend<{ workspace: WorkspaceFixture }>({
  workspace: async ({ context, baseURL }, use) => {
    const path = process.env.ROLEPATCH_E2E_DB_PATH;
    const secret = process.env.ROLEPATCH_E2E_AUTH_SECRET;
    if (!path || !secret || !baseURL || new URL(baseURL).hostname !== 'localhost') {
      throw new Error('Workspace fixtures require the isolated Playwright server on localhost.');
    }
    const db = new DatabaseSync(path);
    db.exec('PRAGMA busy_timeout = 5000;');
    const userId = randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 1, ?, ?)'
    ).run(userId, 'Alex Morgan', `${userId}@example.invalid`, now, now);

    const signIn = async (expiresAt = new Date(Date.now() + 60 * 60 * 1_000)) => {
      const token = randomUUID();
      db.prepare(
        'INSERT INTO "session" (id, token, expiresAt, createdAt, updatedAt, userId) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(randomUUID(), token, expiresAt.toISOString(), now, now, userId);
      const signature = createHmac('sha256', secret).update(token).digest('base64');
      await context.addCookies([
        {
          name: 'better-auth.session_token',
          value: encodeURIComponent(`${token}.${signature}`),
          url: baseURL,
          httpOnly: true,
          sameSite: 'Lax',
        },
      ]);
    };

    try {
      await use({
        userId,
        signIn,
        query: (sql, ...values) => db.prepare(sql).all(...values),
        seedResume: (source, name = 'Master resume') => {
          const id = randomUUID();
          db.prepare('INSERT INTO resumes (id, user_id, name, source) VALUES (?, ?, ?, ?)').run(
            id,
            userId,
            name,
            source
          );
          return id;
        },
      });
    } finally {
      db.close();
    }
  },
});

export { expect } from '@playwright/test';
