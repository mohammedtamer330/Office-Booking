import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import bcrypt from "bcryptjs";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";
import {
  ROLES,
  FUNCTIONS,
  ROLE_FUNCTION_MATRIX,
  ROOMS,
  PEOPLE,
  type RoleKey,
  type FunctionKey,
} from "../src/lib/config/seed-data";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  console.log("Seeding roles...");
  const roleIdByKey = new Map<RoleKey, string>();
  for (const r of ROLES) {
    const existing = await db.query.roles.findFirst({ where: eq(schema.roles.name, r.key) });
    if (existing) {
      roleIdByKey.set(r.key, existing.id);
      continue;
    }
    const [row] = await db.insert(schema.roles).values({ name: r.key, label: r.label }).returning();
    roleIdByKey.set(r.key, row.id);
  }

  console.log("Seeding functions...");
  const functionIdByKey = new Map<FunctionKey, string>();
  for (const f of FUNCTIONS) {
    const existing = await db.query.functions.findFirst({ where: eq(schema.functions.key, f.key) });
    if (existing) {
      functionIdByKey.set(f.key, existing.id);
      continue;
    }
    const [row] = await db
      .insert(schema.functions)
      .values({ key: f.key, label: f.label, color: f.color })
      .returning();
    functionIdByKey.set(f.key, row.id);
  }

  console.log("Seeding role→function links...");
  for (const [roleKey, funcKeys] of Object.entries(ROLE_FUNCTION_MATRIX) as [RoleKey, FunctionKey[]][]) {
    const roleId = roleIdByKey.get(roleKey)!;
    for (const funcKey of funcKeys) {
      const functionId = functionIdByKey.get(funcKey)!;
      const existing = await db.query.roleFunctionLinks.findFirst({
        where: (t, { and, eq }) => and(eq(t.roleId, roleId), eq(t.functionId, functionId)),
      });
      if (!existing) {
        await db.insert(schema.roleFunctionLinks).values({ roleId, functionId });
      }
    }
  }

  console.log("Seeding rooms + room permissions...");
  const roomIdBySlug = new Map<string, string>();
  for (const r of ROOMS) {
    let roomId: string;
    const existing = await db.query.rooms.findFirst({ where: eq(schema.rooms.slug, r.slug) });
    if (existing) {
      roomId = existing.id;
    } else {
      const [row] = await db
        .insert(schema.rooms)
        .values({
          name: r.name,
          slug: r.slug,
          description: r.description,
          requiresPassword: r.requiresPassword,
        })
        .returning();
      roomId = row.id;
    }
    roomIdBySlug.set(r.slug, roomId);

    for (const roleKey of r.allowedRoles) {
      const roleId = roleIdByKey.get(roleKey)!;
      const existingPerm = await db.query.roomPermissions.findFirst({
        where: (t, { and, eq }) => and(eq(t.roomId, roomId), eq(t.roleId, roleId)),
      });
      if (!existingPerm) {
        await db.insert(schema.roomPermissions).values({ roomId, roleId });
      }
    }
  }

  console.log("Seeding people...");
  for (const p of PEOPLE) {
    const roleId = roleIdByKey.get(p.role)!;
    const functionId = functionIdByKey.get(p.function)!;
    const email = p.email.trim().toLowerCase();

    // Match by email first (the durable identity key going forward). Fall
    // back to a name match so the FIRST run after adding the email column
    // backfills the existing row instead of creating a duplicate person —
    // existing bookings/attendance keep pointing at the same person.id.
    const existing =
      (await db.query.people.findFirst({
        where: (t, { sql }) => sql`lower(${t.email}) = ${email}`,
      })) ??
      (await db.query.people.findFirst({
        where: (t, { sql }) => sql`lower(${t.name}) = lower(${p.name})`,
      }));

    if (existing) {
      await db
        .update(schema.people)
        .set({ roleId, functionId, position: p.position ?? null, email, updatedAt: new Date() })
        .where(eq(schema.people.id, existing.id));
    } else {
      await db.insert(schema.people).values({
        name: p.name,
        position: p.position ?? null,
        email,
        roleId,
        functionId,
        active: true,
      });
    }
  }

  console.log("Seeding default settings...");
  const existingSettings = await db.query.settings.findFirst({ where: eq(schema.settings.id, 1) });
  if (!existingSettings) {
    const defaultPassword = process.env.EB_ROOM_PASSWORD || "changeme123";
    const ebRoomPasswordHash = await bcrypt.hash(defaultPassword, 10);
    await db.insert(schema.settings).values({
      id: 1,
      bookingStartDate: "2026-09-01",
      bookingEndDate: "2027-01-31",
      minBookingMinutes: 30,
      maxBookingMinutes: 240,
      checkInWindowBeforeMinutes: 15,
      checkInWindowAfterMinutes: 15,
      lateCheckInPolicy: "ALLOW_WITH_WARNING",
      noShowGraceMinutes: 20,
      cancellationCutoffMinutes: 30,
      ebRoomPasswordHash,
    });
    console.log(
      `EB Room password set from EB_ROOM_PASSWORD env var (or "changeme123" if unset). Change it in Admin → Settings.`,
    );
  } else {
    console.log("Settings row already exists — leaving as is.");
  }

  console.log("Seed complete.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
