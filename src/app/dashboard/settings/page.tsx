import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const defaults = {
  monHours: 1,
  tueHours: 1,
  wedHours: 1,
  thuHours: 1,
  friHours: 1,
  satHours: 1,
  sunHours: 1
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });

  return <SettingsForm initialSettings={settings ?? defaults} />;
}
