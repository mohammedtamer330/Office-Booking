import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIESEC in Suez — Office Booking",
  description: "Internal room booking system for AIESEC in Suez",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
