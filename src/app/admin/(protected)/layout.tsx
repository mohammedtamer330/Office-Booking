import Link from "next/link";
import Image from "next/image";
import { AdminSessionProvider } from "../session-provider";
import { SignOutButton } from "@/components/admin/sign-out-button";
import {
  LayoutDashboard,
  CalendarDays,
  Table2,
  BarChart3,
  Settings,
  ScrollText,
  Users,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: Table2 },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/people", label: "People", icon: Users },
  { href: "/admin/audit-log", label: "Audit log", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSessionProvider>
      <div className="flex min-h-screen bg-background">
        <aside className="hidden w-60 flex-col border-r border-line bg-ink text-white md:flex">
          <div className="flex items-center gap-2 px-5 py-4">
            <Image
              src="/logos/aiesec-suez.png"
              alt="AIESEC in Suez"
              width={130}
              height={32}
              className="h-7 w-auto brightness-0 invert"
            />
          </div>
          <nav className="flex-1 space-y-0.5 px-3 py-2">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-white/10 p-3">
            <SignOutButton />
            <p className="mt-2 px-3 text-[11px] text-white/40">Developed by Mohammed Tamer</p>
          </div>
        </aside>

        <div className="flex-1">
          {/* Mobile top bar */}
          <div className="flex items-center justify-between border-b border-line bg-ink px-4 py-3 text-white md:hidden">
            <Image
              src="/logos/aiesec-suez.png"
              alt="AIESEC in Suez"
              width={110}
              height={28}
              className="h-6 w-auto brightness-0 invert"
            />
            <SignOutButton />
          </div>
          <nav className="flex gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2 md:hidden">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-ink-soft hover:bg-black/5"
              >
                {label}
              </Link>
            ))}
          </nav>
          <main className="p-4 md:p-8">{children}</main>
        </div>
      </div>
    </AdminSessionProvider>
  );
}
