import { Pool } from "pg";

declare global {
  // Évite les connexions multiples en dev (hot reload)
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool() {
  return new Pool({
    host:     process.env.POSTGRES_HOST     || "localhost",
    port:     parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB       || "cnlsourcing",
    user:     process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // SSL uniquement si explicitement demandé (false pour Docker interne)
    ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : false,
  });
}

export const db: Pool =
  process.env.NODE_ENV === "production"
    ? createPool()
    : (global._pgPool ??= createPool());

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const { rows } = await db.query(text, params);
  return rows as T[];
}
