import {
  LayoutDashboard,
  Video,
  AlertTriangle,
  Users,
  Bell,
  Settings,
  MessageSquare,
  MapPin,
  Key,
  DoorOpen,
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
    label: "Chat IA",
    href: "/chat",
    icon: MessageSquare,
    minRole: null,
  },
  {
    label: "Accès",
    href: "/acces",
    icon: Key,
    minRole: "ADMIN" as Role,
  },
  {
    label: "Portes",
    href: "/portes",
    icon: DoorOpen,
    minRole: null,
  },
  {
    label: "Caméras",
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
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    minRole: null,
  },
  {
    label: "Paramètres",
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
