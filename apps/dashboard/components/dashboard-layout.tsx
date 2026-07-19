"use client";

import { SidebarProvider } from "./sidebar-provider";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useSidebar } from "./sidebar-provider";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/page-transition";
import { LicenseExpiryBanner } from "@/components/license-expiry-banner";
import { UpdateAvailableBanner } from "@/components/update-available-banner";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="relative min-h-screen bg-background bg-grid">
      <div className="absolute inset-0 bg-scan pointer-events-none" />
      <Sidebar />
      <div
        className={cn(
          "relative flex flex-col transition-all duration-300",
          isCollapsed ? "ml-16" : "ml-60"
        )}
      >
        <Header />
        <LicenseExpiryBanner />
        <UpdateAvailableBanner />
        <main className="flex-1 p-6 pt-4">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardShell>{children}</DashboardShell>
    </SidebarProvider>
  );
}
