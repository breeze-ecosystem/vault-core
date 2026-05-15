"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-provider";
import { getNavItems, type NavItem } from "@/lib/nav-config";
import { useAuth } from "@/lib/use-auth";
import { Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapsed } = useSidebar();
  const { user } = useAuth();

  const filteredItems = getNavItems(user?.role ?? "");

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 flex h-screen flex-col border-r bg-background/80 backdrop-blur-xl transition-all duration-300",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      <div className={cn(
        "flex h-14 items-center border-b px-4",
        isCollapsed ? "justify-center" : "gap-3"
      )}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        {!isCollapsed && (
          <span className="text-sm font-semibold tracking-tight">OVERSIGHT AI</span>
        )}
      </div>

      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  isCollapsed && "justify-center px-2",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t p-2">
        <button
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
