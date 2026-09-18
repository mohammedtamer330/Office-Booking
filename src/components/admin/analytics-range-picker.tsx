"use client";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function AnalyticsRangePicker({ start, end }: { start: string; end: string }) {
  const router = useRouter();
  function update(key: "start" | "end", value: string) {
    const params = new URLSearchParams({ start, end });
    params.set(key, value);
    router.push(`/admin/analytics?${params.toString()}`);
  }
  return (
    <div className="flex items-center gap-2">
      <Input type="date" defaultValue={start} className="w-auto" onChange={(e) => update("start", e.target.value)} />
      <span className="text-sm text-muted">to</span>
      <Input type="date" defaultValue={end} className="w-auto" onChange={(e) => update("end", e.target.value)} />
    </div>
  );
}
