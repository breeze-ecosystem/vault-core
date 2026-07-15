"use client";

import { useState } from "react";
import { register } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Shield, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (organizationName.trim().length < 2) {
      setError("Le nom de l'organisation doit contenir au moins 2 caractères");
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        organizationName: organizationName.trim(),
      });
      if (result.accessToken) {
        window.location.href = "/";
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background bg-grid p-4">
      <div className="absolute inset-0 bg-scan pointer-events-none" />

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px]" />

      <div className="relative w-full max-w-[420px] animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">OVERSIGHT AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plateforme de surveillance intelligente
          </p>
        </div>

        <div className="glass rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-medium">Inscription</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Créez votre compte et votre organisation
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-slide-up">
                {error}
              </div>
            )}

            {/* Organization section */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Informations de l&apos;organisation
              </p>
              <div className="space-y-2">
                <Label htmlFor="organizationName">Nom de l&apos;organisation</Label>
                <Input
                  id="organizationName"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Entrez le nom de votre organisation"
                  required
                  minLength={2}
                  maxLength={100}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Le nom de votre entreprise ou équipe de sécurité
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Informations personnelles
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jean"
                    required
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
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 caractères"
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-10 rounded-lg font-medium">
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création du compte...
                </span>
              ) : (
                "Créer mon compte"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Déjà inscrit ?{" "}
          <a href="/login" className="text-primary hover:underline">
            Se connecter
          </a>
        </p>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} DigitSoft Africa. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}