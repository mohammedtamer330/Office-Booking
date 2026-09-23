"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Polished replacement for `window.confirm(...)`. Same open/close motion
 * language as the regular Dialog (see `dialog-overlay` / `dialog-pop` in
 * globals.css) so every "are you sure?" moment in the app feels consistent —
 * cancellations, removing an attendee, anything destructive.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red "danger" styling for destructive actions (cancel booking, remove attendee). */
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-[60] bg-black/40" />
        <AlertDialogPrimitive.Content
          className={cn(
            "dialog-pop fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-line bg-surface p-5 shadow-lg",
          )}
        >
          <AlertDialogPrimitive.Title className="text-base font-semibold text-ink">{title}</AlertDialogPrimitive.Title>
          {description && (
            <AlertDialogPrimitive.Description className="mt-1.5 text-sm text-muted">
              {description}
            </AlertDialogPrimitive.Description>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="secondary" size="sm">
                {cancelLabel}
              </Button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild>
              <Button
                variant={danger ? "danger" : "primary"}
                size="sm"
                disabled={pending}
                onClick={(e) => {
                  // Keep the dialog open until the action resolves the parent's `open` state itself;
                  // prevent Radix's default auto-close so callers can close only on success if they want.
                  e.preventDefault();
                  onConfirm();
                }}
              >
                {pending ? "Working…" : confirmLabel}
              </Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
