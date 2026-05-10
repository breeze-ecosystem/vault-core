"use client";

import { SidebarProvider, useSidebar } from "@/components/sidebar-provider";
import { Sidebar, MobileSidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { TooltipProvider } from "@/components/ui/tooltip";

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <MobileSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-3 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <DashboardInner>{children}</DashboardInner>
      </SidebarProvider>
    </TooltipProvider>
  );
}
