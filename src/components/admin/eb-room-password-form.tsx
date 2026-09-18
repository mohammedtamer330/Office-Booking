"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { changeEbRoomPasswordAction } from "@/app/actions/admin-actions";

export function EbRoomPasswordForm() {
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await changeEbRoomPasswordAction({ newPassword: password });
      if (result.success) {
        setMessage({ type: "success", text: "Password updated." });
        setPassword("");
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <Label>New password</Label>
        <Input
          type="password"
          className="mt-1.5"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 4 characters"
        />
      </div>
      <Button type="submit" disabled={isPending || password.length < 4}>
        {isPending ? "Updating…" : "Update password"}
      </Button>
      {message && (
        <span className={`text-sm ${message.type === "success" ? "text-success" : "text-danger"}`}>
          {message.text}
        </span>
      )}
    </form>
  );
}
