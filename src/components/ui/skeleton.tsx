import { cn } from "@/lib/utils";

/** Placeholder block shown while data loads. Decorative — hidden from screen readers. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("skeleton", className)} {...props} />;
}
