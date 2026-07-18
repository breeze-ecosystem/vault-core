'use client';

import { useState, useRef, useCallback } from 'react';
import { GlassCard } from '@/components/glass-card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Upload,
  UploadCloud,
  X,
  Lock,
  Image as ImageIcon,
  Check,
} from 'lucide-react';

interface FaceUploadDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  currentCount: number;
  maxCount: number;
  className?: string;
}

type DropzoneState = 'idle' | 'dragging' | 'file-selected' | 'uploading' | 'error';

export function FaceUploadDropzone({
  onFileSelected,
  disabled = false,
  currentCount,
  maxCount,
  className,
}: FaceUploadDropzoneProps) {
  const [dropState, setDropState] = useState<DropzoneState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [faceName, setFaceName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const limitReached = currentCount >= maxCount;

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return 'Format non supporté. Utilisez JPG ou PNG.';
    }
    if (file.size > 5 * 1024 * 1024) {
      return 'Fichier trop volumineux. Maximum 5 Mo.';
    }
    return null;
  };

  const handleFile = useCallback((file: File) => {
    setErrorMessage(null);
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setDropState('error');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setDropState('file-selected');
    setFaceName(file.name.replace(/\.[^/.]+$/, ''));
    setUploadProgress(0);
    onFileSelected(file);
  }, [onFileSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || limitReached) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [disabled, limitReached, handleFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleClick = () => {
    if (disabled || limitReached) return;
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleReset = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDropState('idle');
    setFaceName('');
    setUploadProgress(0);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const simulateUpload = () => {
    setDropState('uploading');
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 20;
      });
    }, 300);
  };

  // ── Limit reached state ───────────────────────────────────────────────
  if (limitReached) {
    return (
      <GlassCard variant="default" className={cn('p-6 text-center opacity-60', className)}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30">
          <Lock className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium">Limite de {maxCount} visages atteinte</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Passez à BASTION pour débloquer la reconnaissance illimitée.
        </p>
      </GlassCard>
    );
  }

  // ── Uploading state ────────────────────────────────────────────────────
  if (dropState === 'uploading') {
    return (
      <GlassCard variant="default" className={cn('p-6', className)}>
        {previewUrl && (
          <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full border-2 border-primary/30">
            <img src={previewUrl} alt="Aperçu" className="h-full w-full object-cover" />
          </div>
        )}
        <p className="text-sm font-medium text-center">Ajout en cours...</p>
        <p className="text-xs text-muted-foreground text-center mt-1">{faceName}</p>
        <Progress value={uploadProgress} className="mt-4" />
        {uploadProgress >= 100 && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-success">
            <Check className="h-4 w-4" />
            Visage ajouté
          </div>
        )}
      </GlassCard>
    );
  }

  // ── File selected state ────────────────────────────────────────────────
  if (dropState === 'file-selected' && previewUrl) {
    return (
      <GlassCard variant="default" className={cn('p-6', className)}>
        <div className="flex items-start gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border">
            <img
              src={previewUrl}
              alt="Aperçu"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <Label htmlFor="face-name" className="text-xs text-muted-foreground">
                Nom du visage
              </Label>
              <Input
                id="face-name"
                value={faceName}
                onChange={(e) => setFaceName(e.target.value)}
                placeholder="Ex: Jean Dupont"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={simulateUpload}
                className="gap-2"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Ajouter ce visage
              </Button>
              <Button size="sm" variant="outline" onClick={handleReset}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>
    );
  }

  // ── Idle/Drag state ────────────────────────────────────────────────────
  return (
    <div className={cn(className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={cn(
          'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border/50 hover:border-primary/30 hover:bg-muted/10',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          className="hidden"
          onChange={handleInputChange}
        />

        {dragOver ? (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="h-10 w-10 text-primary animate-bounce" />
            <p className="text-sm font-medium text-primary">Déposez la photo ici</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted/30">
              <Upload className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Déposer une photo ou cliquer pour télécharger
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Format JPG ou PNG, max 5 Mo
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {currentCount}/{maxCount} visages utilisés
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <p className="text-xs text-destructive">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
