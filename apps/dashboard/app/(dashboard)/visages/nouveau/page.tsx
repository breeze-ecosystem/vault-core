'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PageTransition } from '@/components/page-transition';
import { GlassCard } from '@/components/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { FaceUploadDropzone } from '@/components/face-upload-dropzone';
import { enrollBastionFace } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { ArrowLeft, Loader2, AlertTriangle, Shield } from 'lucide-react';

export default function NouveauVisagePage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [riskThreshold, setRiskThreshold] = useState([85]);
  const [autoUnlock, setAutoUnlock] = useState(false);
  const [autoUnlockThreshold, setAutoUnlockThreshold] = useState([85]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setErrors((prev) => ({ ...prev, photo: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Le nom est requis';
    if (!selectedFile) newErrors.photo = 'Une photo est requise';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!selectedFile) return;

    setSubmitting(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1] ?? result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      await enrollBastionFace({
        name: name.trim(),
        photoBase64: base64,
        isBlacklisted,
        riskThreshold: isBlacklisted ? riskThreshold[0] : undefined,
      });

      toast('Visage enrôlé avec succès', 'success');
      router.push('/visages');
    } catch (e: any) {
      const detail = e.message || '';
      toast(
        `L'enrôlement a échoué. ${detail ? detail + '. ' : ''}Vérifiez la qualité de la photo (visage net, bien éclairé) et réessayez.`,
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6 max-w-2xl">
        <PageHeader
          title="Enrôler un visage"
          description="Ajoutez un visage à la base de reconnaissance faciale illimitée"
          action={{
            label: 'Retour',
            icon: ArrowLeft,
            onClick: () => router.push('/visages'),
          }}
        />

        {/* Photo upload */}
        <GlassCard variant="default" className="p-6">
          <Label className="text-sm font-medium mb-3 block">Photo du visage</Label>
          <FaceUploadDropzone
            onFileSelected={handleFileSelected}
            currentCount={0}
            maxCount={999999}
          />
          {errors.photo && (
            <p className="mt-2 text-xs text-destructive">{errors.photo}</p>
          )}
        </GlassCard>

        {/* Name */}
        <GlassCard variant="default" className="p-6">
          <Label htmlFor="face-name" className="text-sm font-medium">
            Nom du visage
          </Label>
          <Input
            id="face-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((prev) => ({ ...prev, name: '' }));
            }}
            placeholder="Ex: Jean Dupont"
            className="mt-1.5"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive">{errors.name}</p>
          )}
        </GlassCard>

        {/* Blacklist toggle */}
        <GlassCard variant="default" className="p-6">
          <div className="flex items-start gap-3">
            <Switch
              checked={isBlacklisted}
              onCheckedChange={setIsBlacklisted}
              aria-label="Ajouter à la liste noire"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Ajouter à la liste noire</span>
                {isBlacklisted && <AlertTriangle className="h-4 w-4 text-destructive" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Les détections futures de ce visage déclencheront une alerte CRITIQUE
              </p>
            </div>
          </div>

          {/* Risk threshold slider (shown when blacklisted) */}
          {isBlacklisted && (
            <div className="mt-4 pt-4 border-t border-border">
              <Label className="text-xs text-muted-foreground mb-2 block">
                Seuil de confiance pour l&apos;alerte : {riskThreshold[0]}%
              </Label>
              <Slider
                value={riskThreshold}
                onValueChange={setRiskThreshold}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>0</span>
                <span>100</span>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Auto-unlock config */}
        <GlassCard variant="default" className="p-6">
          <div className="flex items-start gap-3">
            <Switch
              checked={autoUnlock}
              onCheckedChange={setAutoUnlock}
              aria-label="Activer le déverrouillage auto"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Activer le déverrouillage auto</span>
                {autoUnlock && <Shield className="h-4 w-4 text-success" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ce visage pourra déverrouiller les portes automatiquement par reconnaissance faciale
              </p>
            </div>
          </div>

          {autoUnlock && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Seuil de confiance : {autoUnlockThreshold[0]}%
                </Label>
                <Slider
                  value={autoUnlockThreshold}
                  onValueChange={setAutoUnlockThreshold}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>0</span>
                  <span>100</span>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Portes concernées
                </Label>
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    La sélection des portes sera disponible après l&apos;enrôlement depuis la page de détail du visage.
                  </p>
                </div>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <Button size="lg" onClick={handleSubmit} disabled={submitting} className="gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Enrôlement en cours...' : 'Enrôler'}
          </Button>
          <Button variant="outline" size="lg" onClick={() => router.push('/visages')}>
            Annuler
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}
