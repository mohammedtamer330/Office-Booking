"use server";

import { db } from "@/db";
import { people } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { personUpsertSchema } from "@/lib/validation/schemas";

type ActionResult = { success: true } | { success: false; error: string };

export async function upsertPersonAction(raw: unknown): Promise<ActionResult> {
  const parsed = personUpsertSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { id, ...values } = parsed.data;

  if (id) {
    const before = await db.query.people.findFirst({ where: eq(people.id, id) });
    await db.update(people).set({ ...values, updatedAt: new Date() }).where(eq(people.id, id));
    await createAuditLog({
      actorId: "admin",
      actorLabel: "Admin",
      action: "PERSON_EDITED",
      entityType: "person",
      entityId: id,
      oldData: before,
      newData: values,
    });
  } else {
    const [created] = await db.insert(people).values(values).returning();
    await createAuditLog({
      actorId: "admin",
      actorLabel: "Admin",
      action: "PERSON_ADDED",
      entityType: "person",
      entityId: created.id,
      newData: created,
    });
  }

  revalidatePath("/admin/people");
  revalidatePath("/");
  return { success: true };
}

export async function togglePersonActiveAction(id: string, active: boolean): Promise<ActionResult> {
  await db.update(people).set({ active, updatedAt: new Date() }).where(eq(people.id, id));
  await createAuditLog({
    actorId: "admin",
    actorLabel: "Admin",
    action: "PERSON_DEACTIVATED",
    entityType: "person",
    entityId: id,
    newData: { active },
  });
  revalidatePath("/admin/people");
  revalidatePath("/");
  return { success: true };
}
