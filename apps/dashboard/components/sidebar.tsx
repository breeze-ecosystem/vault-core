"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-provider";
import { getNavGroups, type NavGroup } from "@/lib/nav-config";
import { useAuth } from "@/lib/use-auth";
import {
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

function useCollapsedGroups() {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = localStorage.getItem("sidebar-collapsed-groups");
      return new Set(saved ? JSON.parse(saved) : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "sidebar-collapsed-groups",
      JSON.stringify([...collapsed])
    );
  }, [collapsed]);

  return { collapsed, toggle: (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    })
  };
}

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapsed } = useSidebar();
  const { user } = useAuth();
  const { collapsed, toggle } = useCollapsedGroups();

  const groups = getNavGroups(user?.role ?? "");

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
          {groups.map((group) => {
            const GroupIcon = group.icon;
            const groupKey = group.label;
            const isExpanded = !collapsed.has(groupKey);
            const hasActiveChild = group.items.some(
              (item) => pathname === item.href || pathname.startsWith(item.href + "/")
            );

            if (isCollapsed) {
              return (
                <div key={groupKey} className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center justify-center rounded-lg px-2 py-2 text-sm font-medium transition-all",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                        )}
                        title={item.label}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              );
            }

            return (
              <div key={groupKey} className="flex flex-col">
                <button
                  onClick={() => toggle(groupKey)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition-all",
                    hasActiveChild
                      ? "text-primary"
                      : "text-muted-foreground/60 hover:text-foreground"
                  )}
                >
                  <GroupIcon className="h-3.5 w-3.5" />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform",
                      isExpanded ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>
                {isExpanded && (
                  <div className="ml-2 flex flex-col border-l border-border/40 pl-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                          )}
                        >
                          <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
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
