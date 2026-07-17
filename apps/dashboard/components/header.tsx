"use client";

import { useState } from "react";
import { useAuth } from "@/lib/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "./language-switcher";
import { Bell, LogOut, Settings, User, Building2, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { useRouter } from "next/navigation";

export function Header() {
  const { t } = useTranslation();
  const { user, organization, organizations, switchOrganization, logout } = useAuth();
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);
  const router = useRouter();
  const initials = `${user?.firstName?.charAt(0) ?? ""}${user?.lastName?.charAt(0) ?? ""}`;

  const handleSwitchOrg = async (orgId: string) => {
    if (orgId === organization?.id) return;
    setSwitchingOrgId(orgId);
    try {
      await switchOrganization(orgId);
    } catch {
      setSwitchingOrgId(null);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b glass-premium px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success status-pulse" />
          <span className="text-xs text-muted-foreground">{t('common.appName')} Operational</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <LanguageSwitcher />

        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 gap-2 rounded-lg px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {initials || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-xs font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {organization?.name ?? (user ? t('common.loading') : "")}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.firstName} {user?.lastName}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/parametres")}>
              <User className="mr-2 h-4 w-4" />
              {t('common.profile')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/parametres")}>
              <Settings className="mr-2 h-4 w-4" />
              {t('nav.settings')}
            </DropdownMenuItem>

            {organizations.length > 1 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{t('common.organizations')}</DropdownMenuLabel>
                {organizations.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    onClick={() => handleSwitchOrg(org.id)}
                    disabled={switchingOrgId === org.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {switchingOrgId === org.id ? (
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      ) : (
                        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className={org.id === organization?.id ? "font-semibold" : ""}>
                        {org.name}
                        {org.id === organization?.id && (
                          <span className="text-muted-foreground font-normal ml-1">{t('common.current')}</span>
                        )}
                      </span>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0 text-[10px]">
                      {org.role}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t('common.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
