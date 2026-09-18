import { db } from "@/db";
import { auditLogs } from "@/db/schema";

type AuditActionValue = (typeof auditLogs.$inferInsert)["action"];

export async function createAuditLog(entry: {
  actorId: string;
  actorLabel: string;
  action: AuditActionValue;
  entityType: string;
  entityId?: string;
  oldData?: unknown;
  newData?: unknown;
}) {
  await db.insert(auditLogs).values({
    actorId: entry.actorId,
    actorLabel: entry.actorLabel,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    oldData: entry.oldData ?? null,
    newData: entry.newData ?? null,
  });
}
