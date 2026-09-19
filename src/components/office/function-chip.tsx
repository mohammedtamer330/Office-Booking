import { buildFunctionBrand } from "@/lib/config/function-branding";
import { cn } from "@/lib/utils";

/** A function's label with its brand colour as a dot on a soft tint. Text stays ink so it's always readable. */
export function FunctionChip({
  label,
  color,
  className,
}: {
  label: string;
  color: string | null;
  className?: string;
}) {
  const brand = buildFunctionBrand(color);
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold text-ink", className)}
      style={{ backgroundColor: brand.tint }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: brand.base }} />
      {label}
    </span>
  );
}
