export const dynamic = "force-dynamic";

import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AuditLogPage() {
  const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(200);

  return (
    <div>
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
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-line last:border-0 align-top">
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
              </tr>
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
    </div>
  );
}
