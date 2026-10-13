import "server-only";
import { Pool, types } from "pg";

// pg returns NUMERIC and BIGINT columns as strings to avoid losing precision.
// Our values are small, so convert them back to numbers.
types.setTypeParser(types.builtins.NUMERIC, (v) => parseFloat(v));
types.setTypeParser(types.builtins.INT8, (v) => parseInt(v, 10));

// One pool per server process. In development, keep it on globalThis so
// hot reloads don't open a new pool (and exhaust Postgres connections).
const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;
