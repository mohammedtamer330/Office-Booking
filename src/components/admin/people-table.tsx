"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { togglePersonActiveAction } from "@/app/actions/people-actions";
import { PersonFormDialog } from "@/components/admin/person-form-dialog";
import { buildFunctionBrand } from "@/lib/config/function-branding";

type Role = { id: string; label: string };
type Fn = { id: string; label: string; color: string | null };
type Person = {
  id: string;
  name: string;
  position: string | null;
  active: boolean;
  roleId: string;
  functionId: string;
  role: Role;
  function: Fn;
};

export function PeopleTable({ people, roles, functions }: { people: Person[]; roles: Role[]; functions: Fn[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle(id: string, current: boolean) {
    startTransition(async () => {
      await togglePersonActiveAction(id, !current);
      router.refresh();
    });
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs text-muted">
          <th className="px-4 py-2.5 font-medium">Name</th>
          <th className="px-4 py-2.5 font-medium">Role</th>
          <th className="px-4 py-2.5 font-medium">Function</th>
          <th className="px-4 py-2.5 font-medium">Position</th>
          <th className="px-4 py-2.5 font-medium">Active</th>
          <th className="px-4 py-2.5 font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {people.map((p) => {
          const brand = buildFunctionBrand(p.function.color);
          return (
            <tr key={p.id} className="border-b border-line last:border-0">
              <td className="px-4 py-2.5">{p.name}</td>
              <td className="px-4 py-2.5">{p.role.label}</td>
              <td className="px-4 py-2.5">
                <Badge style={{ backgroundColor: brand.tint, color: brand.text }}>{p.function.label}</Badge>
              </td>
              <td className="px-4 py-2.5 text-muted">{p.position ?? "—"}</td>
              <td className="px-4 py-2.5">
                <button
                  disabled={isPending}
                  onClick={() => toggle(p.id, p.active)}
                  className="text-xs underline decoration-line-strong hover:decoration-ink"
                >
                  {p.active ? "Active" : "Inactive"}
                </button>
              </td>
              <td className="px-4 py-2.5">
                <PersonFormDialog roles={roles} functions={functions} person={p} trigger="Edit" />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
