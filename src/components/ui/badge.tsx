import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  style,
  variant = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const variantClass = {
    neutral: "bg-black/5 text-ink-soft",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    info: "bg-ink/5 text-ink",
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClass,
        className,
      )}
      style={style}
      {...props}
    />
  );
}
