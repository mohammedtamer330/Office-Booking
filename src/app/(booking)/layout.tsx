import { SiteHeader } from "@/components/site-header";

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-background">{children}</main>
      <footer className="border-t border-line py-4 text-center text-xs text-muted">
        <p>AIESEC in Suez · Internal Office Booking</p>
        <p className="mt-1">Website developed by Mohammed Tamer</p>
      </footer>
    </div>
  );
}
