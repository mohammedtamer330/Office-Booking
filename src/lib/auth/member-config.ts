import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";
import { db } from "@/db";
import { AIESEC_EMAIL_DOMAIN } from "@/lib/config/seed-data";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function findActiveMemberByEmail(email: string) {
  return db.query.people.findFirst({
    where: (t, { sql }) => sql`lower(${t.email}) = ${email}`,
    with: { role: true, function: true },
  });
}

/**
 * Member identity — separate from the single shared admin account
 * (src/lib/auth/index.ts, src/lib/auth/config.ts). Every AIESEC member signs
 * in with their own @aiesec.net Google account; who they are (and whether
 * they may sign in at all) is always re-derived from the database here, on
 * the server, never trusted from the client. See src/lib/auth/current-member.ts
 * for how server actions/pages read the result.
 *
 * Mounted at its own basePath + its own session cookie name so it never
 * collides with the admin session — the two are unrelated logins.
 */
export const memberAuthConfig: NextAuthConfig = {
  basePath: "/api/auth/member",
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  cookies: {
    sessionToken: {
      name: "member-session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [Google],
  callbacks: {
    // Gate at sign-in time: wrong domain, unknown email, or inactive person
    // all fail here — before a session is ever created. Domain validation
    // alone is deliberately NOT enough (an @aiesec.net address that isn't in
    // the People table, or is deactivated, is rejected too).
    async signIn({ user }) {
      if (!user.email) return false;
      const email = normalizeEmail(user.email);
      if (!email.endsWith(`@${AIESEC_EMAIL_DOMAIN}`)) return false;
      const person = await findActiveMemberByEmail(email);
      return !!person && person.active;
    },
    async jwt({ token, user }) {
      // `user` is only present on the sign-in request itself; look the
      // person up again so the token always reflects the current record
      // (a role/function/position edited later just means signing in again).
      if (user?.email) {
        const person = await findActiveMemberByEmail(normalizeEmail(user.email));
        if (person) {
          token.personId = person.id;
          token.personName = person.name;
          token.personPosition = person.position;
          token.roleId = person.roleId;
          token.functionId = person.functionId;
          token.roleLabel = person.role.label;
          token.functionLabel = person.function.label;
          token.functionColor = person.function.color;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.personId) {
        session.personId = token.personId as string;
        session.personName = token.personName as string;
        session.personPosition = (token.personPosition as string | null | undefined) ?? null;
        session.roleId = token.roleId as string;
        session.functionId = token.functionId as string;
        session.roleLabel = token.roleLabel as string;
        session.functionLabel = token.functionLabel as string;
        session.functionColor = (token.functionColor as string | null | undefined) ?? null;
      }
      return session;
    },
  },
};
