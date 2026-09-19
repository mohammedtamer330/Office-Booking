import { auth } from "./index";

/**
 * Server Actions are reachable by a direct POST, not only through the admin
 * pages that render them — so the middleware that protects /admin/* is not
 * enough on its own. Every admin-only action calls this first.
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return !!session?.user;
}

export const ADMIN_REQUIRED_MESSAGE = "Your admin session has expired. Please sign in again.";
