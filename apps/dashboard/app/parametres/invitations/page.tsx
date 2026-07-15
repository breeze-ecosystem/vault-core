"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/use-auth";
import { fetchInvites, createInvite, resendInvite, revokeInvite } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Send, X, Loader2 } from "lucide-react";

interface Invite {
  id: string;
  email: string;
  role: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  createdAt: string;
}

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Administrateur" },
  { value: "SUPERVISOR", label: "Superviseur" },
  { value: "OPERATOR", label: "Opérateur" },
  { value: "VIEWER", label: "Observateur" },
];

function getStatusConfig(status: string): { label: string; variant: "outline" | "secondary" | "destructive" | "success" | "warning" } {
  switch (status) {
    case "ACCEPTED": return { label: "Acceptée", variant: "success" };
    case "EXPIRED": return { label: "Expirée", variant: "destructive" };
    case "REVOKED": return { label: "Révoquée", variant: "secondary" };
    default: return { label: "En attente", variant: "warning" };
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function InvitationsPage() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Revoke dialog state
  const [revokeTarget, setRevokeTarget] = useState<Invite | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadInvites = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInvites(orgId);
      setInvites(data as Invite[]);
    } catch (e: any) {
      setError(e.message || "Erreur lors du chargement des invitations");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");

    if (!email.trim()) {
      setCreateError("L'adresse email est requise");
      return;
    }
    if (!email.includes("@")) {
      setCreateError("Adresse email invalide");
      return;
    }
    if (!role) {
      setCreateError("Le rôle est requis");
      return;
    }

    setCreating(true);
    try {
      await createInvite(orgId!, { email: email.trim(), role });
      toast(`Invitation envoyée à ${email.trim()}`, "success");
      setCreateOpen(false);
      setEmail("");
      setRole("VIEWER");
      loadInvites();
    } catch (e: any) {
      setCreateError(e.message || "Échec de l'envoi de l'invitation");
      toast("Échec de l'envoi de l'invitation", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleResend(invite: Invite) {
    try {
      await resendInvite(orgId!, invite.id);
      toast(`Invitation renvoyée à ${invite.email}`, "success");
    } catch {
      toast("Échec du renvoi de l'invitation", "error");
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await revokeInvite(orgId!, revokeTarget.id);
      toast("Invitation révoquée", "success");
      setRevokeTarget(null);
      loadInvites();
    } catch {
      toast("Échec de la révocation", "error");
    } finally {
      setRevoking(false);
    }
  }

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Sélectionnez une organisation pour gérer les invitations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Invitations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les invitations à rejoindre votre organisation
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Inviter un membre
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inviter un membre</DialogTitle>
              <DialogDescription>
                Envoyez une invitation par email pour rejoindre l'organisation.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateInvite} className="space-y-4">
              {createError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {createError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="invite-email">Adresse email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="collegue@exemple.com"
                  required
                  disabled={creating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-role">Rôle</Label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={creating}
                  required
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={creating}>
                    Annuler
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </span>
                  ) : (
                    "Envoyer l'invitation"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table or empty state */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : invites.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center rounded-lg border border-dashed border-border">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <UserPlus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium">Aucune invitation</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Envoyez une invitation pour ajouter des membres à votre organisation.
          </p>
          <Button
            variant="outline"
            className="mt-4 gap-2"
            onClick={() => setCreateOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Inviter un membre
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rôle</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Envoyée le</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => {
                const statusCfg = getStatusConfig(invite.status);
                return (
                  <tr key={invite.id} className="border-b border-border transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">{invite.email}</td>
                    <td className="px-4 py-3">
                      {ROLE_OPTIONS.find((r) => r.value === invite.role)?.label || invite.role}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(invite.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {invite.status === "PENDING" && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-muted-foreground"
                            onClick={() => handleResend(invite)}
                          >
                            <Send className="h-3.5 w-3.5" />
                            Renvoyer
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-destructive hover:text-destructive"
                            onClick={() => setRevokeTarget(invite)}
                          >
                            <X className="h-3.5 w-3.5" />
                            Révoquer l'invitation
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Revoke confirmation dialog */}
      <Dialog
        open={!!revokeTarget}
        onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Révoquer l'invitation</DialogTitle>
            <DialogDescription>
              {revokeTarget?.email} ne pourra plus rejoindre l'organisation. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)} disabled={revoking}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revoking}
            >
              {revoking ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Révocation...
                </span>
              ) : (
                "Révoquer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}