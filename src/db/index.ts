import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __pgClient: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __drizzleDb: PostgresJsDatabase<typeof schema> | undefined;
}

/**
 * Lazily creates the DB client on first real use rather than at module import
 * time. This means the app can still be built/type-checked without a
 * DATABASE_URL present (e.g. in CI), while every actual request path still
 * gets a real, validated Postgres connection.
 */
function getDb(): PostgresJsDatabase<typeof schema> {
  if (global.__drizzleDb) return global.__drizzleDb;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add a Postgres connection string (Vercel Postgres, Neon, Supabase, or any managed Postgres) to your environment variables.",
    );
  }

  const client =
    global.__pgClient ??
    postgres(connectionString, {
      max: 1,
      prepare: false,
    });
  global.__pgClient = client;

  const instance = drizzle(client, { schema });
  global.__drizzleDb = instance;
  return instance;
}

// `db` behaves like a normal Drizzle instance to callers, but the underlying
// client + connection are only created the first time a property on it is
// actually accessed.
export const db: PostgresJsDatabase<typeof schema> = new Proxy(
  {} as PostgresJsDatabase<typeof schema>,
  {
    get(_target, prop, receiver) {
      const real = getDb();
      const value = Reflect.get(real as object, prop, receiver);
      return typeof value === "function" ? value.bind(real) : value;
    },
  },
);
