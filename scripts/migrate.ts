/**
 * Applies every .sql file in /drizzle, in filename order, exactly once.
 * Run with: npm run db:migrate
 *
 * We use a small hand-rolled runner instead of drizzle-kit's own migrator so
 * that the hand-written 0001_booking_overlap_guard.sql (a GiST exclusion
 * constraint drizzle-kit can't generate on its own) applies cleanly alongside
 * the auto-generated schema migration.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  const sql = postgres(connectionString, { max: 1 });

  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const dir = path.join(process.cwd(), "drizzle");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const already = await sql`SELECT 1 FROM _migrations WHERE name = ${file}`;
    if (already.length > 0) {
      console.log(`skip  ${file} (already applied)`);
      continue;
    }

    const fullPath = path.join(dir, file);
    const content = fs.readFileSync(fullPath, "utf-8");
    console.log(`apply ${file} ...`);

    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO _migrations (name) VALUES (${file})`;
    });

    console.log(`done  ${file}`);
  }

  await sql.end();
  console.log("Migrations complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
