"use client";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function CalendarDatePicker({ date }: { date: string }) {
  const router = useRouter();
  return (
    <Input
      type="date"
      defaultValue={date}
      className="w-auto"
      onChange={(e) => router.push(`/admin/calendar?date=${e.target.value}`)}
    />
  );
}
