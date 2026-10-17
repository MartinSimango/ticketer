import { SettingsForm } from "@/components/settings-form";
import { loadSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return <SettingsForm initial={loadSettings()} />;
}
