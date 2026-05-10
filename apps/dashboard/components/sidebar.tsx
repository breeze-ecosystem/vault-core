"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useSidebar } from "@/components/sidebar-provider";
import { getNavItems } from "@/lib/nav-config";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n/context";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const { t } = useTranslation();

  const items = getNavItems(user?.role ?? "VIEWER");

  // Map nav item href to i18n key
  const navKeyMap: Record<string, string> = {
    "/": "nav.dashboard",
    "/cameras": "nav.cameras",
    "/alertes": "nav.alerts",
    "/sites": "nav.sites",
    "/utilisateurs": "nav.users",
    "/parametres": "nav.settings",
    "/notifications": "nav.notifications",
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-border bg-card transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className={cn("flex h-14 items-center border-b border-border px-4", isCollapsed && "justify-center px-2")}>
        {isCollapsed ? (
          <span className="text-lg font-bold text-primary">O</span>
        ) : (
          <span className="text-lg font-bold text-primary">{t("common.appName")}</span>
        )}
      </div>

      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {items.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            const label = navKeyMap[item.href] ? t(navKeyMap[item.href]!) : item.label;

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>{label}</span>}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>
      </ScrollArea>

      <Separator />
      <div className={cn("p-3 text-xs text-muted-foreground", isCollapsed && "text-center")}>
        {isCollapsed ? "v1.0" : `${t("common.appName")} v1.0`}
      </div>
    </aside>
  );
}

export function MobileSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isMobileOpen, closeMobile } = useSidebar();
  const { t } = useTranslation();

  const items = getNavItems(user?.role ?? "VIEWER");

  const navKeyMap: Record<string, string> = {
    "/": "nav.dashboard",
    "/cameras": "nav.cameras",
    "/alertes": "nav.alerts",
    "/sites": "nav.sites",
    "/utilisateurs": "nav.users",
    "/parametres": "nav.settings",
    "/notifications": "nav.notifications",
  };

  if (!isMobileOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/80" onClick={closeMobile} />
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border">
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className="text-lg font-bold text-primary">{t("common.appName")}</span>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {items.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            const label = navKeyMap[item.href] ? t(navKeyMap[item.href]!) : item.label;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
