"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { FileText, Loader2, Download, Check } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { itemVariants } from "@/components/page-transition";
import { toast } from "@/components/ui/toast";

interface HapdpDeclarationFormProps {
  clientInfo: any;
  siteInfo: any;
  onGenerate: (data: any) => Promise<void>;
  loading?: boolean;
}

const PROCESSING_TYPE_OPTIONS = [
  { id: "video-surveillance", label: "Vidéo surveillance temps réel" },
  { id: "access-control", label: "Contrôle d'accès biométrique" },
  { id: "anpr", label: "Reconnaissance automatique de plaques" },
  { id: "face-recognition", label: "Reconnaissance faciale" },
  { id: "visitor-management", label: "Gestion des visiteurs" },
  { id: "incident-recording", label: "Enregistrement des incidents" },
  { id: "analytics", label: "Analyse comportementale" },
];

export function HapdpDeclarationForm({
  clientInfo,
  siteInfo,
  onGenerate,
  loading = false,
}: HapdpDeclarationFormProps) {
  const [organization, setOrganization] = useState(
    clientInfo?.name || "",
  );
  const [address, setAddress] = useState(clientInfo?.address || "");
  const [siret, setSiret] = useState(clientInfo?.siret || "");
  const [representative, setRepresentative] = useState(
    clientInfo?.representative || "",
  );
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [declarationDate, setDeclarationDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [generating, setGenerating] = useState(false);

  if (loading) {
    return (
      <motion.div variants={itemVariants}>
        <GlassCard className="p-5">
          <div className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  const toggleType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleGenerate = async () => {
    if (!organization.trim()) {
      toast.error("Le nom de l'organisation est requis");
      return;
    }
    if (selectedTypes.length === 0) {
      toast.error("Sélectionnez au moins un type de traitement");
      return;
    }

    setGenerating(true);
    try {
      await onGenerate({
        organization: organization.trim(),
        address: address.trim(),
        siret: siret.trim(),
        representative: representative.trim(),
        processingTypes: selectedTypes,
        declarationDate,
      });
      toast.success(
        "Déclaration HAPDP générée — Téléchargement en cours",
      );
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <GlassCard className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold">
            Déclaration HAPDP
          </h3>
        </div>

        <div className="space-y-4">
          {/* Organisation (read-only from profile) */}
          <div className="space-y-2">
            <Label htmlFor="dec-org">Organisation</Label>
            <Input
              id="dec-org"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Nom de l'organisation"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="dec-address">Adresse</Label>
            <Input
              id="dec-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Adresse complète"
            />
          </div>

          {/* SIRET + Representative */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dec-siret">Numéro SIRET</Label>
              <Input
                id="dec-siret"
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
                placeholder="14 chiffres"
                maxLength={14}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dec-rep">Représentant</Label>
              <Input
                id="dec-rep"
                value={representative}
                onChange={(e) => setRepresentative(e.target.value)}
                placeholder="Nom du représentant"
              />
            </div>
          </div>

          {/* Processing Types */}
          <div className="space-y-2">
            <Label>Types de traitements</Label>
            <div className="space-y-2">
              {PROCESSING_TYPE_OPTIONS.map((pt) => (
                <label
                  key={pt.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/30"
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(pt.id)}
                    onChange={() => toggleType(pt.id)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">{pt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Declaration Date */}
          <div className="space-y-2">
            <Label htmlFor="dec-date">Date de déclaration</Label>
            <Input
              id="dec-date"
              type="date"
              value={declarationDate}
              onChange={(e) => setDeclarationDate(e.target.value)}
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Générer la déclaration HAPDP
              </>
            )}
          </Button>
        </div>
      </GlassCard>
    </motion.div>
  );
}
