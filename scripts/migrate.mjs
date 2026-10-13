// Applies db/schema.sql. Every statement uses IF NOT EXISTS, so running it
// on each deploy is safe. Usage: DATABASE_URL=... node scripts/migrate.mjs
import { readFile } from "node:fs/promises";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
try {
  await client.query(sql);
  console.log("Database schema is up to date");
} finally {
  await client.end();
}
