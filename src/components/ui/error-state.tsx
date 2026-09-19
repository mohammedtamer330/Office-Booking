"use client";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A friendly, recoverable error. Never shows raw API/database messages. */
export function ErrorState({
  message = "Something went wrong while loading the schedule.",
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center rounded-xl border border-line bg-surface px-6 py-10 text-center", className)}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertCircle className="size-5" />
      </span>
      <p className="mt-3 max-w-xs text-sm text-ink-soft">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCw /> Try again
        </Button>
      )}
    </div>
  );
}
