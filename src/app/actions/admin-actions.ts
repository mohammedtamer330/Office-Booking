"use server";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { settingsUpdateSchema, changeEbRoomPasswordSchema } from "@/lib/validation/schemas";

type ActionResult = { success: true } | { success: false; error: string };

export async function updateSettingsAction(raw: unknown): Promise<ActionResult> {
  const parsed = settingsUpdateSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const before = await db.query.settings.findFirst({ where: eq(settings.id, 1) });
  await db.update(settings).set({ ...parsed.data, updatedAt: new Date() }).where(eq(settings.id, 1));

  await createAuditLog({
    actorId: "admin",
    actorLabel: "Admin",
    action: "SETTINGS_CHANGED",
    entityType: "settings",
    oldData: before,
    newData: parsed.data,
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { success: true };
}

export async function changeEbRoomPasswordAction(raw: unknown): Promise<ActionResult> {
  const parsed = changeEbRoomPasswordSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const hash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db.update(settings).set({ ebRoomPasswordHash: hash, updatedAt: new Date() }).where(eq(settings.id, 1));

  await createAuditLog({
    actorId: "admin",
    actorLabel: "Admin",
    action: "PASSWORD_CHANGED",
    entityType: "settings",
    entityId: "eb-room-password",
  });

  revalidatePath("/admin/settings");
  return { success: true };
}
