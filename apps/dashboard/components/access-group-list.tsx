'use client';

import { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import {
  getAccessGroups,
  createAccessGroup,
  updateAccessGroup,
  deleteAccessGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  type AccessGroup,
} from '@/lib/api';
import { toast } from '@/components/ui/toast';
import {
  Users,
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AccessGroupList() {
  const [groups, setGroups] = useState<AccessGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<AccessGroup | null>(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAccessGroups({ page: 1, limit: 100 });
      setGroups(result.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      await createAccessGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || undefined,
      });
      toast('Groupe créé avec succès', 'success');
      setShowCreateDialog(false);
      setNewGroupName('');
      setNewGroupDesc('');
      loadGroups();
    } catch (e: any) {
      toast(e.message || 'Échec de création du groupe', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteAccessGroup(deleteConfirm.id);
      toast(`Groupe supprimé : ${deleteConfirm.name}`, 'success');
      setDeleteConfirm(null);
      loadGroups();
    } catch (e: any) {
      toast(e.message || 'Échec de suppression du groupe', 'error');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-border/40">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-sm text-destructive mb-2">Erreur de chargement</div>
        <p className="text-xs text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={loadGroups}>
          Réessayer
        </Button>
      </div>
    );
  }

  // Empty state
  if (groups.length === 0) {
    return (
      <GlassCard variant="default" className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30">
            <Users className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium">Aucun groupe d&apos;accès</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Créez des groupes pour organiser les profils par rôle (employé, manager, visiteur).
          </p>
          <Button
            variant="default"
            size="sm"
            className="mt-4 gap-2"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4" />
            Créer un groupe
          </Button>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{groups.length} groupe{groups.length !== 1 ? 's' : ''}</p>
        <Button size="sm" className="gap-2" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          Nouveau groupe
        </Button>
      </div>

      {/* Group list */}
      {groups.map((group) => (
        <GlassCard
          key={group.id}
          variant="default"
          className={cn('p-4 transition-all', expandedId === group.id && 'ring-1 ring-primary/20')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => setExpandedId(expandedId === group.id ? null : group.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                {expandedId === group.id ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{group.name}</p>
                {group.description && (
                  <p className="text-xs text-muted-foreground truncate">{group.description}</p>
                )}
              </div>

              <Badge
                variant={group.isActive ? 'success' : 'secondary'}
                className="text-[10px]"
              >
                {group.isActive ? 'Actif' : 'Inactif'}
              </Badge>

              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {group._count?.members ?? 0} membre{(group._count?.members ?? 0) !== 1 ? 's' : ''}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => {/* Edit handler */}}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteConfirm(group)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Expanded members section */}
          {expandedId === group.id && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Membres</span>
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                  <UserPlus className="h-3 w-3" />
                  Ajouter
                </Button>
              </div>
              <p className="text-xs text-muted-foreground py-4 text-center">
                {group._count?.members && group._count.members > 0
                  ? `${group._count.members} membre(s)`
                  : 'Aucun membre dans ce groupe. Ajoutez des utilisateurs pour leur attribuer les permissions du groupe.'}
              </p>
            </div>
          )}
        </GlassCard>
      ))}

      {/* Create group dialog */}
      {/* Using inline dialog for simplicity */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <GlassCard variant="default" className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Nouveau groupe</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="group-name" className="text-xs text-muted-foreground">
                  Nom du groupe
                </Label>
                <Input
                  id="group-name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ex: Employés"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="group-desc" className="text-xs text-muted-foreground">
                  Description (optionnelle)
                </Label>
                <Input
                  id="group-desc"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Ex: Accès bâtiment principal"
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setNewGroupName('');
                    setNewGroupDesc('');
                  }}
                >
                  Annuler
                </Button>
                <Button onClick={handleCreateGroup} disabled={creating || !newGroupName.trim()}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {creating ? 'Création...' : 'Créer'}
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmationDialog
        isOpen={!!deleteConfirm}
        title="Supprimer le groupe"
        description={
          deleteConfirm
            ? `Le groupe "${deleteConfirm.name}" et ses permissions seront supprimés. Les utilisateurs du groupe conserveront leurs accès individuels.`
            : ''
        }
        confirmLabel="Supprimer"
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
