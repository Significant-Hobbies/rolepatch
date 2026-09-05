import { betterAuth } from 'better-auth';
import { createAdapter } from 'better-auth/adapters';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import { db } from '@/lib/db';
import { ping } from '@/lib/ping';

// ---------------------------------------------------------------------------
// Lightweight SQLite adapter backed by the app's Cloudflare D1 wrapper.
// Avoids pulling a full ORM into the CF Worker bundle.
// ---------------------------------------------------------------------------

type SqlArg = string | number | boolean | null;

function buildWhere(
  where: Array<{ field: string; operator?: string; value: unknown; connector?: string }>
): { sql: string; args: SqlArg[] } {
  if (!where.length) return { sql: '', args: [] };
  const parts: string[] = [];
  const args: SqlArg[] = [];
  for (const w of where) {
    const op = w.operator ?? 'eq';
    const val = w.value;
    const connector = w.connector === 'OR' ? 'OR' : 'AND';
    if (parts.length) parts.push(connector);
    switch (op) {
      case 'eq':
        parts.push(`"${w.field}" = ?`);
        args.push(val as SqlArg);
        break;
      case 'ne':
        parts.push(`"${w.field}" != ?`);
        args.push(val as SqlArg);
        break;
      case 'lt':
        parts.push(`"${w.field}" < ?`);
        args.push(val as SqlArg);
        break;
      case 'lte':
        parts.push(`"${w.field}" <= ?`);
        args.push(val as SqlArg);
        break;
      case 'gt':
        parts.push(`"${w.field}" > ?`);
        args.push(val as SqlArg);
        break;
      case 'gte':
        parts.push(`"${w.field}" >= ?`);
        args.push(val as SqlArg);
        break;
      case 'in':
        parts.push(`"${w.field}" IN (${(val as unknown[]).map(() => '?').join(',')})`);
        args.push(...(val as SqlArg[]));
        break;
      case 'not_in':
        parts.push(`"${w.field}" NOT IN (${(val as unknown[]).map(() => '?').join(',')})`);
        args.push(...(val as SqlArg[]));
        break;
      case 'contains':
        parts.push(`"${w.field}" LIKE ?`);
        args.push(`%${val}%`);
        break;
      case 'starts_with':
        parts.push(`"${w.field}" LIKE ?`);
        args.push(`${val}%`);
        break;
      case 'ends_with':
        parts.push(`"${w.field}" LIKE ?`);
        args.push(`%${val}`);
        break;
      default:
        parts.push(`"${w.field}" = ?`);
        args.push(val as SqlArg);
    }
  }
  return { sql: parts.join(' '), args };
}

const d1Adapter = createAdapter({
  config: {
    adapterId: 'cloudflare-d1',
    adapterName: 'Cloudflare D1',
    supportsNumericIds: false,
    supportsJSON: false,
    supportsDates: false,
    supportsBooleans: false,
    transaction: false,
  },
  adapter: ({ getDefaultModelName }) => ({
    async create({ model, data, select }) {
      const table = getDefaultModelName(model);
      const id = (data as any).id ?? crypto.randomUUID();
      const row = { id, ...data };
      const cols = Object.keys(row);
      const placeholders = cols.map(() => '?');
      const args = Object.values(row).map((v) =>
        v instanceof Date ? v.toISOString() : (v as SqlArg)
      );
      await db.execute({
        sql: `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(',')}) VALUES (${placeholders.join(',')})`,
        args,
      });
      const result = await db.execute({
        sql: `SELECT * FROM "${table}" WHERE "id" = ?`,
        args: [id],
      });
      const out = result.rows[0] ?? {};
      if (select?.length) return Object.fromEntries(select.map((k) => [k, out[k]])) as any;
      return out as any;
    },

    async findOne({ model, where, select }) {
      const table = getDefaultModelName(model);
      const { sql: whereSql, args } = buildWhere(where as any[]);
      const result = await db.execute({
        sql: `SELECT * FROM "${table}"${whereSql ? ` WHERE ${whereSql}` : ''} LIMIT 1`,
        args,
      });
      if (!result.rows.length) return null;
      const out = result.rows[0];
      if (select?.length) return Object.fromEntries(select.map((k) => [k, out[k]])) as any;
      return out as any;
    },

    async findMany({ model, where, limit, offset, sortBy }) {
      const table = getDefaultModelName(model);
      const { sql: whereSql, args } = buildWhere((where ?? []) as any[]);
      let sql = `SELECT * FROM "${table}"`;
      if (whereSql) sql += ` WHERE ${whereSql}`;
      if (sortBy)
        sql += ` ORDER BY "${(sortBy as any).field}" ${(sortBy as any).direction === 'desc' ? 'DESC' : 'ASC'}`;
      if (limit) sql += ` LIMIT ${limit}`;
      if (offset) sql += ` OFFSET ${offset}`;
      const result = await db.execute({ sql, args });
      return result.rows as any[];
    },

    async update({ model, where, update }) {
      const table = getDefaultModelName(model);
      if (!Object.keys(update as object).length) return null;
      const setCols = Object.keys(update as object)
        .map((k) => `"${k}" = ?`)
        .join(', ');
      const setArgs = Object.values(update as object).map((v) =>
        v instanceof Date ? v.toISOString() : (v as SqlArg)
      );
      const { sql: whereSql, args: whereArgs } = buildWhere(where as any[]);
      await db.execute({
        sql: `UPDATE "${table}" SET ${setCols}${whereSql ? ` WHERE ${whereSql}` : ''}`,
        args: [...setArgs, ...whereArgs],
      });
      const result = await db.execute({
        sql: `SELECT * FROM "${table}"${whereSql ? ` WHERE ${whereSql}` : ''} LIMIT 1`,
        args: whereArgs,
      });
      return (result.rows[0] ?? null) as any;
    },

    async updateMany({ model, where, update }) {
      const table = getDefaultModelName(model);
      if (!Object.keys(update as object).length) return 0;
      const setCols = Object.keys(update as object)
        .map((k) => `"${k}" = ?`)
        .join(', ');
      const setArgs = Object.values(update as object).map((v) =>
        v instanceof Date ? v.toISOString() : (v as SqlArg)
      );
      const { sql: whereSql, args: whereArgs } = buildWhere(where as any[]);
      const r = await db.execute({
        sql: `UPDATE "${table}" SET ${setCols}${whereSql ? ` WHERE ${whereSql}` : ''}`,
        args: [...setArgs, ...whereArgs],
      });
      return r.rowsAffected;
    },

    async delete({ model, where }) {
      const table = getDefaultModelName(model);
      const { sql: whereSql, args } = buildWhere(where as any[]);
      await db.execute({
        sql: `DELETE FROM "${table}"${whereSql ? ` WHERE ${whereSql}` : ''}`,
        args,
      });
    },

    async deleteMany({ model, where }) {
      const table = getDefaultModelName(model);
      const { sql: whereSql, args } = buildWhere(where as any[]);
      const r = await db.execute({
        sql: `DELETE FROM "${table}"${whereSql ? ` WHERE ${whereSql}` : ''}`,
        args,
      });
      return r.rowsAffected;
    },

    async count({ model, where }) {
      const table = getDefaultModelName(model);
      const { sql: whereSql, args } = buildWhere((where ?? []) as any[]);
      const result = await db.execute({
        sql: `SELECT COUNT(*) as cnt FROM "${table}"${whereSql ? ` WHERE ${whereSql}` : ''}`,
        args,
      });
      return (result.rows[0]?.cnt as number) ?? 0;
    },
  }),
});

export type AuthRuntimeEnv = {
  NODE_ENV?: string;
  npm_lifecycle_event?: string;
  NEXT_PHASE?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

/**
 * OpenNext populates process.env from the Cloudflare request environment.
 * Keep this construction request-lazy so Worker module evaluation cannot
 * freeze production secrets as undefined before that initialization occurs.
 */
export function buildAuthOptions(env: AuthRuntimeEnv = process.env) {
  const canUseLocalAuthSecret =
    env.NODE_ENV !== 'production' ||
    env.npm_lifecycle_event === 'build' ||
    env.NEXT_PHASE === 'phase-production-build';
  const authSecret =
    env.BETTER_AUTH_SECRET?.trim() ||
    (canUseLocalAuthSecret ? 'resume-tailor-local-development-secret-32-chars' : undefined);
  const googleClientId = env.GOOGLE_CLIENT_ID?.trim();
  const googleClientSecret = env.GOOGLE_CLIENT_SECRET?.trim();

  return {
    secret: authSecret,
    baseURL: env.BETTER_AUTH_URL?.trim() || undefined,
    basePath: '/api/auth',
    database: d1Adapter,
    socialProviders:
      googleClientId && googleClientSecret
        ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
        : {},
    trustedOrigins: env.BETTER_AUTH_URL ? [env.BETTER_AUTH_URL] : [],
    databaseHooks: {
      user: {
        create: {
          after: async (newUser) => {
            await ping('signup', {
              title: newUser.email,
              props: { id: newUser.id, name: newUser.name },
            });
          },
        },
      },
    },
  };
}

function createAuth(env: AuthRuntimeEnv = process.env) {
  return betterAuth(buildAuthOptions(env));
}

let authInstance: ReturnType<typeof createAuth> | undefined;

function getRuntimeAuthEnv(): AuthRuntimeEnv {
  try {
    const { env } = getCloudflareContext({ async: false });
    return env as unknown as AuthRuntimeEnv;
  } catch {
    return process.env;
  }
}

export function getAuth(): ReturnType<typeof createAuth> {
  authInstance ??= createAuth(getRuntimeAuthEnv());
  return authInstance;
}
