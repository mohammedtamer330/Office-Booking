/** The shape every server action returns, so callers handle success/failure the same way. */
export type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };
