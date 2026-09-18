export const dynamic = "force-dynamic";

import { db } from "@/db";
import { roles, functions } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { PeopleTable } from "@/components/admin/people-table";
import { PersonFormDialog } from "@/components/admin/person-form-dialog";

export default async function AdminPeoplePage() {
  const [allPeople, allRoles, allFunctions] = await Promise.all([
    db.query.people.findMany({
      with: { role: true, function: true },
      orderBy: (t, { asc }) => asc(t.name),
    }),
    db.select().from(roles),
    db.select().from(functions),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">People</h1>
          <p className="mt-1 text-sm text-muted">{allPeople.length} people</p>
        </div>
        <PersonFormDialog roles={allRoles} functions={allFunctions} />
      </div>

      <Card className="mt-5 overflow-x-auto">
        <PeopleTable people={allPeople} roles={allRoles} functions={allFunctions} />
      </Card>
    </div>
  );
}
