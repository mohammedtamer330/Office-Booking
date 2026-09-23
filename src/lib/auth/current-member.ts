import { memberAuth } from "./member";

export type CurrentMember = {
  personId: string;
  name: string;
  email: string;
  position: string | null;
  roleId: string;
  functionId: string;
  roleLabel: string;
  functionLabel: string;
  functionColor: string | null;
};

/**
 * The ONLY correct way to find out "who is making this request" anywhere in
 * the member-facing app (booking creation, My Bookings). Never accept a
 * personId from the client for anything that determines ownership or
 * authorization — always call this instead. Returns null if signed out, the
 * Google account isn't an active member, or the session is stale.
 */
export async function getCurrentMember(): Promise<CurrentMember | null> {
  const session = await memberAuth();
  if (
    !session?.personId ||
    !session.personName ||
    !session.roleId ||
    !session.functionId ||
    !session.roleLabel ||
    !session.functionLabel
  )
    return null;
  return {
    personId: session.personId,
    name: session.personName,
    email: session.user?.email ?? "",
    position: session.personPosition ?? null,
    roleId: session.roleId,
    functionId: session.functionId,
    roleLabel: session.roleLabel,
    functionLabel: session.functionLabel,
    functionColor: session.functionColor ?? null,
  };
}

export const SIGN_IN_REQUIRED_MESSAGE = "Please sign in with your AIESEC Google account to continue.";
