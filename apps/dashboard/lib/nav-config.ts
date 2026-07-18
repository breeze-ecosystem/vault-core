import {
  LayoutDashboard,
  Video,
  AlertTriangle,
  Users,
  Bell,
  MessageSquare,
  MapPin,
  Key,
  DoorOpen,
  Clock,
  Car,
  Monitor,
  BarChart3,
  Gauge,
  Repeat,
  Wrench,
  ShieldAlert,
  Building2,
  Zap,
  Scan,
  UserCheck,
  Settings,
  HardDrive,
  Shield,
  Moon,
  Globe,
  Wifi,
  Share2,
  Puzzle,
  Code2,
  FileSpreadsheet,
  Database,
  type LucideIcon,
} from "lucide-react";
import { hasMinRole, type Role } from "@repo/shared";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  minRole: Role | null;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  minRole: Role | null;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    label: "Tableau de bord",
    icon: LayoutDashboard,
    minRole: null,
    items: [
      { label: "Vue d'ensemble", href: "/", icon: LayoutDashboard, minRole: null },
      { label: "Chronologie", href: "/chronologie", icon: Clock, minRole: null },
      { label: "Analytique", href: "/analytique", icon: BarChart3, minRole: "SUPERVISOR" as Role },
    ],
  },
  {
    label: "Sécurité",
    icon: ShieldAlert,
    minRole: null,
    items: [
      { label: "Caméras", href: "/cameras", icon: Video, minRole: null },
      { label: "Découverte", href: "/cameras/decouverte", icon: Scan, minRole: "ADMIN" as Role },
      { label: "Visages", href: "/visages", icon: UserCheck, minRole: "ADMIN" as Role },
      { label: "Portes", href: "/portes", icon: DoorOpen, minRole: null },
      { label: "Accès", href: "/acces", icon: Key, minRole: "ADMIN" as Role },
      { label: "Alertes", href: "/alertes", icon: AlertTriangle, minRole: null },
      { label: "Incidents", href: "/incidents", icon: AlertTriangle, minRole: null },
    ],
  },
  {
    label: "Équipement",
    icon: Monitor,
    minRole: null,
    items: [
      { label: "Équipement", href: "/equipement", icon: Monitor, minRole: null },
      { label: "Maintenance", href: "/maintenance", icon: Wrench, minRole: null },
      { label: "Schémas", href: "/schemas", icon: Repeat, minRole: "SUPERVISOR" as Role },
    ],
  },
  {
    label: "Gestion",
    icon: Building2,
    minRole: null,
    items: [
      { label: "Sites", href: "/sites", icon: MapPin, minRole: null },
      { label: "Utilisateurs", href: "/utilisateurs", icon: Users, minRole: "ADMIN" as Role },
      { label: "Véhicules", href: "/vehicules", icon: Car, minRole: null },
      { label: "Visiteurs", href: "/visiteurs", icon: Users, minRole: null },
      { label: "Risques", href: "/risque", icon: Gauge, minRole: "SUPERVISOR" as Role },
    ],
  },
  {
    label: "Conformité",
    icon: Shield,
    minRole: "SUPERVISOR" as Role,
    items: [
      { label: "Conformité HAPDP", href: "/conformite/hapdp", icon: Shield, minRole: "SUPERVISOR" as Role },
      { label: "Registre des traitements", href: "/conformite/hapdp/registre", icon: FileSpreadsheet, minRole: "SUPERVISOR" as Role },
    ],
  },
  {
    label: "Intelligence",
    icon: Zap,
    minRole: null,
    items: [
      { label: "Centre de commande", href: "/command-center", icon: Zap, minRole: null },
      { label: "Motifs", href: "/patterns", icon: Repeat, minRole: "SUPERVISOR" as Role },
    ],
  },
  {
    label: "Intégrations",
    icon: Puzzle,
    minRole: "ADMIN" as Role,
    items: [
      { label: "Intégrations", href: "/integrations", icon: Puzzle, minRole: "ADMIN" as Role },
    ],
  },
  {
    label: "Outils",
    icon: MessageSquare,
    minRole: null,
    items: [
      { label: "Notifications", href: "/notifications", icon: Bell, minRole: null },
    ],
  },
  {
    label: "Paramètres",
    icon: Settings,
    minRole: null,
    items: [
      { label: "Enregistrement", href: "/parametres/enregistrement", icon: HardDrive, minRole: "ADMIN" as Role },
      { label: "Partage de flux", href: "/partage", icon: Share2, minRole: "ADMIN" as Role },
      { label: "Mode Absence", href: "/parametres/absence", icon: Shield, minRole: "ADMIN" as Role },
      { label: "Notifications silencieuses", href: "/parametres/notification-silencieuse", icon: Moon, minRole: null },
      { label: "Canaux d'alerte", href: "/parametres/alertes", icon: Bell, minRole: "ADMIN" as Role },
      { label: "Accès distant", href: "/parametres/acces-distant", icon: Globe, minRole: "ADMIN" as Role },
      { label: "API & Webhooks", href: "/parametres/api", icon: Code2, minRole: "ADMIN" as Role },
      { label: "Rétention avancée", href: "/parametres/retention", icon: HardDrive, minRole: "ADMIN" as Role },
      { label: "Sauvegarde", href: "/parametres/sauvegarde", icon: Database, minRole: "ADMIN" as Role },
    ],
  },
];

export function getNavItems(userRole: string): NavItem[] {
  return groups
    .filter(
      (group) => group.minRole === null || hasMinRole(userRole as Role, group.minRole)
    )
    .flatMap((group) =>
      group.items.filter(
        (item) => item.minRole === null || hasMinRole(userRole as Role, item.minRole)
      )
    );
}

export function getNavGroups(userRole: string): NavGroup[] {
  return groups
    .filter(
      (group) =>
        group.minRole === null || hasMinRole(userRole as Role, group.minRole)
    )
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => item.minRole === null || hasMinRole(userRole as Role, item.minRole)
      ),
    }))
    .filter((group) => group.items.length > 0);
}
