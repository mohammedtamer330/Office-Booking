export const dynamic = "force-dynamic";

import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTransition, StaggerRow } from "@/components/motion/primitives";

export default async function AuditLogPage() {
  const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(200);

  return (
    <PageTransition>
      <h1 className="text-2xl font-semibold text-ink">Audit log</h1>
      <p className="mt-1 text-sm text-muted">Most recent 200 events. Protected from normal editing.</p>

      <Card className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-4 py-2.5 font-medium">When</th>
              <th className="px-4 py-2.5 font-medium">Actor</th>
              <th className="px-4 py-2.5 font-medium">Action</th>
              <th className="px-4 py-2.5 font-medium">Entity</th>
              <th className="px-4 py-2.5 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <StaggerRow
                key={log.id}
                as="tr"
                index={i}
                className="border-b border-line align-top transition-colors duration-150 last:border-0 hover:bg-black/[0.02]"
              >
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted tabular">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2.5">{log.actorLabel}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="info">{log.action.replace(/_/g, " ")}</Badge>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted">
                  {log.entityType}
                  {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                </td>
                <td className="max-w-xs px-4 py-2.5 text-xs text-muted">
                  {log.newData ? (
                    <pre className="whitespace-pre-wrap break-all">{JSON.stringify(log.newData)}</pre>
                  ) : (
                    "—"
                  )}
                </td>
              </StaggerRow>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </PageTransition>
  );
}
