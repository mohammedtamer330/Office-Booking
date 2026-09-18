import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";

/**
 * Admin authentication for v1. There is exactly one admin account, gated by
 * ADMIN_PASSWORD_HASH (never a plaintext password) in the environment.
 * The architecture (section 33 of the spec) is intentionally left open to
 * grow into per-admin accounts stored in the `people`/a future `admins`
 * table later — this Credentials provider can be swapped for a DB lookup
 * without touching anything else (middleware, session usage) below.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  // Vercel sets this automatically in production; explicit here so local
  // dev/start and non-Vercel hosts don't hit Auth.js's UntrustedHost guard.
  trustHost: true,
  providers: [
    Credentials({
      name: "Admin Password",
      credentials: { password: { label: "Password", type: "password" } },
      async authorize(credentials) {
        const password = credentials?.password;
        const hash = process.env.ADMIN_PASSWORD_HASH;
        if (!password || typeof password !== "string" || !hash) return null;

        const valid = await bcrypt.compare(password, hash);
        if (!valid) return null;

        return { id: "admin", name: "Admin", email: undefined };
      },
    }),
  ],
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
};
