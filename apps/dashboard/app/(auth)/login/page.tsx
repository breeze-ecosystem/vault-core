"use client";

import { useState, useEffect } from "react";
import { login } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Shield, LogIn } from "lucide-react";
import { getAccessToken } from "@/lib/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasSso, setHasSso] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(true);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
    fetch(`${API_URL}/api/auth/sso/config`, {
      headers: { "Content-Type": "application/json" },
      ...(getAccessToken() ? { headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAccessToken()}` } } : {}),
    })
      .then((res) => res.ok ? res.json() : { configured: false })
      .then((config) => setHasSso("isActive" in config ? !!(config as any).isActive : false))
      .catch(() => {})
      .finally(() => setSsoLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.error) {
        setError("Identifiants incorrects");
      } else {
        window.location.href = "/";
      }
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background bg-grid p-4">
      <div className="absolute inset-0 bg-scan pointer-events-none" />

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px]" />

      <div className="relative w-full max-w-[400px] animate-fade-in">
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
            <h2 className="text-base font-medium">Connexion</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Connectez-vous pour accéder au tableau de bord
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-slide-up">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                autoFocus
                className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-all pr-10"
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

            <Button type="submit" disabled={loading} className="w-full h-10 rounded-lg font-medium">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Connexion...
                </span>
              ) : (
                "Se connecter"
              )}
            </Button>

            {!ssoLoading && hasSso && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ou</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 rounded-lg font-medium"
                  onClick={() => { window.location.href = "/api/auth/sso/login"; }}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Se connecter avec SSO
                </Button>
              </>
            )}
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} DigitSoft Africa. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
