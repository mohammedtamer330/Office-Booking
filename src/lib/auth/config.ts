import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";

/**
 * Admin authentication for v1. There is exactly one admin account, gated by
 * ADMIN_PASSWORD_HASH (never a plaintext password) in the environment.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  trustHost: true,
  providers: [
    Credentials({
      name: "Admin Password",
      credentials: { password: { label: "Password", type: "password" } },
      async authorize(credentials) {
        const password = credentials?.password;
        const hash = process.env.ADMIN_PASSWORD_HASH;
        if (!password || typeof password !== "string") {
          console.error("[admin-auth] No password submitted");
          return null;
        }
        if (!hash) {
          console.error("[admin-auth] ADMIN_PASSWORD_HASH is not set in this environment");
          return null;
        }
        console.error("[admin-auth] using hash of length", hash.length, "starting", JSON.stringify(hash.slice(0, 10)), "ending", JSON.stringify(hash.slice(-6)));

        const valid = await bcrypt.compare(password, hash);
        if (!valid) {
          console.error("[admin-auth] Password did not match the stored hash");
          return null;
        }

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