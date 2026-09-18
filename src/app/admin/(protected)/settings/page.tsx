export const dynamic = "force-dynamic";

import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/settings-form";
import { EbRoomPasswordForm } from "@/components/admin/eb-room-password-form";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">Settings</h1>
      <p className="mt-1 text-sm text-muted">Booking rules, period, and security — applied instantly, app-wide.</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Booking rules & period</CardTitle>
          <CardDescription>Nothing here is hardcoded — every booking is validated against these values.</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm settings={settings} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>EB Room password</CardTitle>
          <CardDescription>Stored as a hash. Never exposed to the frontend.</CardDescription>
        </CardHeader>
        <CardContent>
          <EbRoomPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
