import { redirect } from "next/navigation";
import { DashboardSidebarContent } from "@/components/dashboard/DashboardSidebarContent";
import { MobileSidebar } from "@/components/dashboard/MobileSidebar";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="grid min-h-screen lg:h-screen lg:grid-cols-[280px_1fr] lg:overflow-hidden">
      <aside className="hidden flex-col border-r border-border bg-card/80 px-4 py-5 sm:px-5 lg:flex lg:h-screen lg:overflow-y-auto">
        <DashboardSidebarContent login={user.login} />
      </aside>

      <div className="min-w-0">
        <MobileSidebar login={user.login} />
        <main className="space-y-4 p-3 sm:p-5 lg:h-screen lg:overflow-y-auto lg:p-6">{children}</main>
      </div>
    </div>
  );
}
