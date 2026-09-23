import NextAuth from "next-auth";
import { memberAuthConfig } from "./member-config";

export const {
  handlers: memberHandlers,
  auth: memberAuth,
  signIn: memberSignIn,
  signOut: memberSignOut,
} = NextAuth(memberAuthConfig);
