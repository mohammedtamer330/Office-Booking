"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const STORAGE_KEY = "aiesec-booking:last-person-id";

export function PersonPicker({
  people,
  selectedId,
}: {
  people: { id: string; name: string }[];
  selectedId?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!selectedId) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && people.some((p) => p.id === stored)) {
        router.replace(`/my-bookings?person=${stored}`);
      }
    }
  }, [selectedId, people, router]);

  function handleChange(id: string) {
    localStorage.setItem(STORAGE_KEY, id);
    router.push(`/my-bookings?person=${id}`);
  }

  return (
    <Select value={selectedId} onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select your name" />
      </SelectTrigger>
      <SelectContent>
        {people.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
