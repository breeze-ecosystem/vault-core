"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  requiredRole?: string;
  userRole?: string;
  isLoading?: boolean;
}

// Simple role hierarchy check
const ROLE_WEIGHTS: Record<string, number> = {
  ADMIN: 100,
  SUPERVISOR: 75,
  OPERATOR: 50,
  VIEWER: 25,
  AUDITOR: 25,
};

function hasMinRole(userRole: string, minRole: string): boolean {
  const userWeight = ROLE_WEIGHTS[userRole] ?? 0;
  const minWeight = ROLE_WEIGHTS[minRole] ?? 0;
  return userWeight >= minWeight;
}

export function ConfirmationDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  requiredRole,
  userRole,
  isLoading = false,
}: ConfirmationDialogProps) {
  const { t } = useTranslation();
  const defaultConfirm = confirmLabel ?? t('common.confirm');
  const isAuthorized =
    !requiredRole || !userRole || hasMinRole(userRole, requiredRole);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <DialogTitle className="text-lg">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            {t('common.cancel')}
          </Button>
          {isAuthorized ? (
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? t('common.saving') : defaultConfirm}
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-4 py-2 rounded-lg bg-secondary/50">
              <ShieldAlert className="h-4 w-4" />
              Action non autorisée pour votre rôle.
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
