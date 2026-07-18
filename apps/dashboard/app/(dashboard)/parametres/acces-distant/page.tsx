"use client";

import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Globe,
  ExternalLink,
  Wifi,
  Monitor,
  Shield,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function AccesDistantPage() {
  return (
    <PageTransition>
      <div>
        <PageHeader
          title="Accès distant"
          description="Configurez l'accès à votre système depuis l'extérieur"
        />

        <div className="space-y-6">
          {/* Status card */}
          <GlassCard className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="text-base font-semibold">Accès distant</h3>
                  <Badge variant="warning" className="mt-1">
                    Configuration requise
                  </Badge>
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              L&apos;accès distant permet de visualiser vos caméras et de recevoir des alertes
              lorsque vous n&apos;êtes pas sur le réseau local.
            </p>
          </GlassCard>

          {/* DDNS section */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <ExternalLink className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Domaines personnalisés (DDNS)</h3>
            </div>

            <div className="mb-4 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">Fournisseur</p>
                  <p className="text-xs text-muted-foreground">DuckDNS (pré-configuré)</p>
                </div>
                <Badge variant="outline">Non configuré</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Domaine</p>
                  <p className="text-xs text-muted-foreground">votre-domaine.duckdns.org</p>
                </div>
                <Badge variant="warning">Conteneur inactif</Badge>
              </div>
            </div>

            <Button variant="outline" size="sm">
              <BookOpen className="mr-2 h-4 w-4" />
              Configurer le DDNS
            </Button>
          </GlassCard>

          {/* Setup guide */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Guide de configuration</h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Suivez ces étapes pour configurer l&apos;accès distant à votre système.
            </p>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium">Configurez votre routeur</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Accédez à l&apos;interface d&apos;administration de votre routeur et
                    assurez-vous que le port 443 est ouvert et redirigé vers votre serveur VaultOS.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium">Activez le DDNS</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Créez un compte DuckDNS ou No-IP, configurez votre nom de domaine,
                    et installez le client DDNS sur votre serveur.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium">Redirigez le port 443</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configurez la redirection de port sur votre routeur pour que le trafic
                    HTTPS (port 443) atteigne votre serveur VaultOS.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  4
                </div>
                <div>
                  <p className="text-sm font-medium">Vérifiez la connexion</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Depuis un réseau externe (4G/5G), ouvrez https://votre-domaine.duckdns.org
                    dans votre navigateur. Vous devriez voir l&apos;interface de connexion.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* VPN section */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">VPN (WireGuard)</h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Pour une sécurité maximale, nous recommandons d&apos;utiliser un VPN
              WireGuard plutôt que d&apos;exposer directement l&apos;interface web.
            </p>
            <Button variant="outline" size="sm">
              <BookOpen className="mr-2 h-4 w-4" />
              Documentation WireGuard
            </Button>
          </GlassCard>
        </div>
      </div>
    </PageTransition>
  );
}
