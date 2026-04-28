import {
  LayoutDashboard,
  Video,
  AlertTriangle,
  MapPin,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { hasMinRole, type Role } from "@repo/shared";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  minRole: Role | null;
}

const navItems: NavItem[] = [
  {
    label: "Vue d'ensemble",
    href: "/",
    icon: LayoutDashboard,
    minRole: null,
  },
  {
    label: "Cameras",
    href: "/cameras",
    icon: Video,
    minRole: null,
  },
  {
    label: "Alertes",
    href: "/alertes",
    icon: AlertTriangle,
    minRole: null,
  },
  {
    label: "Sites",
    href: "/sites",
    icon: MapPin,
    minRole: null,
  },
  {
    label: "Utilisateurs",
    href: "/utilisateurs",
    icon: Users,
    minRole: "ADMIN" as Role,
  },
  {
    label: "Parametres",
    href: "/parametres",
    icon: Settings,
    minRole: null,
  },
];

export function getNavItems(userRole: string): NavItem[] {
  return navItems.filter(
    (item) => item.minRole === null || hasMinRole(userRole as Role, item.minRole)
  );
}
