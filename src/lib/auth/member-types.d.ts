import type { DefaultSession } from "next-auth";

// Augments the *default* next-auth module types. Since this app runs two
// separate NextAuth instances (admin: src/lib/auth/index.ts, member:
// src/lib/auth/member.ts) sharing the same `next-auth` package types, these
// fields are simply optional/absent on the admin session, which never sets
// them.
declare module "next-auth" {
  interface Session extends DefaultSession {
    personId?: string;
    personName?: string;
    personPosition?: string | null;
    roleId?: string;
    functionId?: string;
    roleLabel?: string;
    functionLabel?: string;
    functionColor?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    personId?: string;
    personName?: string;
    personPosition?: string | null;
    roleId?: string;
    functionId?: string;
    roleLabel?: string;
    functionLabel?: string;
    functionColor?: string | null;
  }
}
