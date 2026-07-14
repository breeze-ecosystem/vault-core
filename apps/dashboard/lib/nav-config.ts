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
  Clock,
  Shield,
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
    label: "Chronologie",
    href: "/chronologie",
    icon: Clock,
    minRole: null,
  },
  {
    label: "Audit",
    href: "/audit",
    icon: Shield,
    minRole: "ADMIN" as Role,
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
    label: "Incidents",
    href: "/incidents",
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
    label: "Visiteurs",
    href: "/visiteurs",
    icon: Users,
    minRole: null,
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
