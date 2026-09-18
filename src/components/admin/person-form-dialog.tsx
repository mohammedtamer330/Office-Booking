"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertPersonAction } from "@/app/actions/people-actions";

type Role = { id: string; label: string };
type Fn = { id: string; label: string };
type Person = { id: string; name: string; position: string | null; roleId: string; functionId: string };

export function PersonFormDialog({
  roles,
  functions,
  person,
  trigger = "Add person",
}: {
  roles: Role[];
  functions: Fn[];
  person?: Person;
  trigger?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(person?.name ?? "");
  const [position, setPosition] = useState(person?.position ?? "");
  const [roleId, setRoleId] = useState(person?.roleId ?? roles[0]?.id ?? "");
  const [functionId, setFunctionId] = useState(person?.functionId ?? functions[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await upsertPersonAction({
        id: person?.id,
        name,
        position: position || null,
        roleId,
        functionId,
        active: true,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={person ? "outline" : "primary"} size="sm">
          {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{person ? "Edit person" : "Add person"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label>Position (optional)</Label>
            <Input className="mt-1.5" value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Role</Label>
              <select
                className="mt-1.5 h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Function</Label>
              <select
                className="mt-1.5 h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm"
                value={functionId}
                onChange={(e) => setFunctionId(e.target.value)}
              >
                {functions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
