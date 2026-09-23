export const dynamic = "force-dynamic";

import Link from "next/link";
import { memberSignIn, memberSignOut } from "@/lib/auth/member";
import { getCurrentMember } from "@/lib/auth/current-member";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FunctionChip } from "@/components/office/function-chip";
import { FadeIn } from "@/components/motion/primitives";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const continueTo = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/";
  const member = await getCurrentMember();

  if (!member) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-5 py-16 text-center">
        <FadeIn>
          <h1 className="text-2xl font-semibold text-ink">Sign in</h1>
          <p className="mt-2 text-sm text-muted">
            Use your AIESEC Google Workspace account (@aiesec.net) to book a room.
          </p>
          <form
            className="mt-6"
            action={async () => {
              "use server";
              await memberSignIn("google", { redirectTo: `/login?callbackUrl=${encodeURIComponent(continueTo)}` });
            }}
          >
            <Button type="submit" size="touch" className="w-full">
              Sign in with Google
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted">
            Only active AIESEC in Suez members already set up by an admin can sign in.
          </p>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-5 py-16">
      <FadeIn className="w-full">
        <Card className="p-6 text-center">
          <p className="text-sm text-muted">Welcome,</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">{member.name}</h1>
          <div className="mt-3 flex items-center justify-center gap-2">
            <FunctionChip label={member.functionLabel} color={member.functionColor} />
            <span className="text-sm text-muted">· {member.position ?? member.roleLabel}</span>
          </div>
          <p className="mt-3 text-xs text-muted tabular">{member.email}</p>

          <Button asChild size="touch" className="mt-6 w-full">
            <Link href={continueTo}>Continue to booking</Link>
          </Button>

          <form
            className="mt-2"
            action={async () => {
              "use server";
              await memberSignOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="ghost" size="touch" className="w-full">
              Not you? Sign out
            </Button>
          </form>
        </Card>
      </FadeIn>
    </div>
  );
}
