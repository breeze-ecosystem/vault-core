"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Check, Loader2, Shield } from "lucide-react";
import { acceptInvite } from "@/lib/api";

type InviteState =
  | { status: "loading" }
  | { status: "valid"; organizationName: string; role: string; hasAccount: boolean }
  | { status: "expired" }
  | { status: "alreadyAccepted" }
  | { status: "invalid" }
  | { status: "error"; message: string }
  | { status: "submitting" }
  | { status: "success" };

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;

  const [state, setState] = useState<InviteState>({ status: "loading" });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    async function validate() {
      if (!token) {
        setState({ status: "invalid" });
        return;
      }
      try {
        // Validate token by trying to fetch invite info
        // For now, we rely on the accept endpoint to tell us if the token is valid
        // The server will return specific errors for expired/already-accepted/invalid tokens
        setState({ status: "loading" });
        // Try to decode basic info from the token to show org name and role
        // A proper validation endpoint would be GET /api/organizations/invites/:token/validate
        // For now, the form will show and the submit will error appropriately
        const payload = decodeJwtPayload(token);
        if (payload?.orgName && payload?.role) {
          setState({
            status: "valid",
            organizationName: payload.orgName,
            role: translateRole(payload.role),
            hasAccount: payload.hasAccount === true,
          });
        } else {
          // If we can't decode, just show the form with basic info
          setState({
            status: "valid",
            organizationName: "l'organisation",
            role: "membre",
            hasAccount: false,
          });
        }
      } catch {
        setState({ status: "invalid" });
      }
    }
    validate();
  }, [token]);

  function decodeJwtPayload(token: string): Record<string, any> | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  function translateRole(role: string): string {
    const roles: Record<string, string> = {
      ADMIN: "Administrateur",
      SUPERVISOR: "Superviseur",
      OPERATOR: "Opérateur",
      VIEWER: "Observateur",
    };
    return roles[role] || role;
  }

  async function handleNewUserSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!firstName.trim()) {
      setFormError("Le prénom est requis");
      return;
    }
    if (!lastName.trim()) {
      setFormError("Le nom est requis");
      return;
    }
    if (password.length < 8) {
      setFormError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Les mots de passe ne correspondent pas");
      return;
    }

    setState({ status: "submitting" });

    try {
      const result = await acceptInvite({
        token,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      if (result.accessToken) {
        setState({ status: "success" });
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      } else {
        setState(prev => prev.status === "submitting"
          ? { status: "valid", organizationName: (prev as any).organizationName, role: (prev as any).role, hasAccount: false }
          : { status: "error", message: "Erreur lors de l'acceptation" });
      }
    } catch (err: any) {
      const msg = err.message || "Erreur lors de l'acceptation";
      if (msg.includes("expir") || msg.includes("expired")) {
        setState({ status: "expired" });
      } else if (msg.includes("déjà") || msg.includes("already")) {
        setState({ status: "alreadyAccepted" });
      } else {
        setFormError(msg);
        setState(prev => prev.status === "submitting"
          ? { status: "valid", organizationName: (prev as any).organizationName, role: (prev as any).role, hasAccount: false }
          : { status: "error", message: msg });
      }
    }
  }

  async function handleExistingUserSubmit() {
    setFormError("");
    setState({ status: "submitting" });

    try {
      const result = await acceptInvite({ token });
      if (result.accessToken) {
        setState({ status: "success" });
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      }
    } catch (err: any) {
      const msg = err.message || "Erreur lors de l'acceptation";
      if (msg.includes("expir") || msg.includes("expired")) {
        setState({ status: "expired" });
      } else if (msg.includes("déjà") || msg.includes("already")) {
        setState({ status: "alreadyAccepted" });
      } else {
        setFormError(msg);
        setState(prev =>
          prev.status === "submitting"
            ? { status: "valid", organizationName: (prev as any).organizationName, role: (prev as any).role, hasAccount: true }
            : { status: "error", message: msg }
        );
      }
    }
  }

  // --- Loading state ---
  if (state.status === "loading") {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-[420px]">
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Vérification de l'invitation...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- Success state ---
  if (state.status === "success") {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-[420px]">
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <Check className="h-6 w-6 text-success" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Redirection vers le tableau de bord...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- Error states ---
  if (state.status === "expired") {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-[420px]">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-lg">Cette invitation a expiré</CardTitle>
              <CardDescription className="mt-2">
                Cette invitation a expiré. Veuillez contacter l'administrateur de votre organisation pour en recevoir une nouvelle.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Button variant="outline" onClick={() => router.push("/login")}>
                Se connecter
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (state.status === "alreadyAccepted") {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-[420px]">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <CardTitle className="text-lg">Invitation déjà acceptée</CardTitle>
              <CardDescription className="mt-2">
                Vous avez déjà rejoint cette organisation. Connectez-vous pour y accéder.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Button onClick={() => router.push("/login")}>
                Se connecter
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (state.status === "invalid") {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-[420px]">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-lg">Invitation invalide</CardTitle>
              <CardDescription className="mt-2">
                Ce lien d'invitation n'est pas valide. Veuillez vérifier le lien ou contacter l'administrateur.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Button variant="outline" onClick={() => router.push("/login")}>
                Se connecter
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- Valid invite ---
  const { organizationName, role, hasAccount } = state as Extract<InviteState, { status: "valid" }>;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">OVERSIGHT AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plateforme de surveillance intelligente
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Rejoindre l'organisation</CardTitle>
            <CardDescription>
              Vous avez été invité à rejoindre {organizationName} en tant que {role}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formError && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {formError}
              </div>
            )}

            {hasAccount ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Vous avez déjà un compte. Cliquez ci-dessous pour rejoindre {organizationName}.
                </p>
                <Button
                  onClick={handleExistingUserSubmit}
                  disabled={state.status === "submitting"}
                  className="w-full"
                >
                  {state.status === "submitting" ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Rejoindre...
                    </span>
                  ) : (
                    "Rejoindre"
                  )}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleNewUserSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jean"
                      required
                      disabled={state.status === "submitting"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Dupont"
                      required
                      disabled={state.status === "submitting"}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 caractères"
                    required
                    minLength={8}
                    disabled={state.status === "submitting"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Répétez le mot de passe"
                    required
                    disabled={state.status === "submitting"}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={state.status === "submitting"}
                  className="w-full"
                >
                  {state.status === "submitting" ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Rejoindre l'organisation...
                    </span>
                  ) : (
                    "Rejoindre l'organisation"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}