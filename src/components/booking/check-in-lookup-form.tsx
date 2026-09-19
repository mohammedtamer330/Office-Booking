"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { lookupBookingByCodeAction } from "@/app/actions/lookup-actions";

export function CheckInLookupForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await lookupBookingByCodeAction(code);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/check-in/${result.token}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="booking-code">Booking code</Label>
        <Input
          id="booking-code"
          className="mt-1.5 tabular"
          placeholder="BK-2026-0001"
          value={code}
          onChange={(e) => setCode(e.target.value)}
         
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={isPending || !code.trim()}>
        {isPending ? "Looking up…" : "Continue"}
      </Button>
    </form>
  );
}
