"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/glass-card";
import { LiveCameraGrid } from "@/components/live-camera-grid";
import { CameraCardPremium } from "@/components/camera-card-premium";
import {
  fetchCameras,
  fetchOrganizations,
  createCamera,
  updateCamera,
  deleteCamera,
  startStream,
  stopStream,
  fetchActiveStreams,
  fetchCameraSnapshot,
  fetchCameraPrompts,
  addCameraPrompt,
  updateCameraPrompt,
  deleteCameraPrompt,
  type Camera,
  type Organization,
  type CameraPrompt,
} from "@/lib/api";
import { toast } from "@/components/ui/toast";
import {
  Plus, Video, Settings, X, Play, Square, Eye, Trash2, Radio,
  Search, LayoutGrid, Map, AlertTriangle, List,
} from "lucide-react";
import VideoPlayer from "@/components/video-player";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "@/lib/i18n/context";

const statusColors: Record<string, "success" | "destructive" | "warning" | "default"> = {
  ONLINE: "success",
  OFFLINE: "destructive",
  MAINTENANCE: "warning",
  DEGRADED: "default",
};

const statusLabels: Record<string, string> = {
  ONLINE: "En ligne",
  OFFLINE: "Hors ligne",
  MAINTENANCE: "Maintenance",
  DEGRADED: "Dégradé",
};

const statusPills = [
  { value: "", label: "Toutes" },
  { value: "ONLINE", label: "En ligne" },
  { value: "OFFLINE", label: "Hors ligne" },
  { value: "DEGRADED", label: "Dégradé" },
  { value: "MAINTENANCE", label: "Maintenance" },
];

const MAX_CAMERAS = 10;

export default function CamerasPage() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showForm, setShowForm] = useState(false);
  const [showOnvifScan, setShowOnvifScan] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [previewCamera, setPreviewCamera] = useState<Camera | null>(null);
  const [previewSnapshot, setPreviewSnapshot] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [liveCamera, setLiveCamera] = useState<Camera | null>(null);
  const [sites, setSites] = useState<Organization[]>([]);
  const [activeStreams, setActiveStreams] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [camerasData, setCamerasData] = useState<Camera[]>([]);
  const [camerasLoading, setCamerasLoading] = useState(true);
  const [camerasError, setCamerasError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", rtspUrl: "", organizationId: "", resolution: "", fps: 25, captureInterval: 5 });

  useEffect(() => {
    fetchOrganizations({ limit: 100 }).then((r) => setSites(r.data)).catch(() => {});
    fetchActiveStreams().then(setActiveStreams).catch(() => {});
  }, [refreshKey]);

  useEffect(() => {
    setCamerasLoading(true);
    setCamerasError(null);
    const filters: Record<string, string> | undefined = statusFilter ? { status: statusFilter } : undefined;
    fetchCameras({ limit: 200, ...filters })
      .then((r) => setCamerasData(r.data))
      .catch((e) => setCamerasError(e.message))
      .finally(() => setCamerasLoading(false));
  }, [refreshKey, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredCameras = useMemo(() => {
    if (!debouncedSearch) return camerasData;
    const q = debouncedSearch.toLowerCase();
    return camerasData.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.organization?.name?.toLowerCase().includes(q)
    );
  }, [camerasData, debouncedSearch]);

  function resetForm() {
    setForm({ name: "", rtspUrl: "", organizationId: "", resolution: "", fps: 25, captureInterval: 5 });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(camera: Camera) {
    setForm({
      name: camera.name,
      rtspUrl: camera.rtspUrl,
      organizationId: camera.organizationId,
      resolution: camera.resolution ?? "",
      fps: camera.fps,
      captureInterval: camera.captureInterval ?? 5,
    });
    setEditingId(camera.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data: any = { name: form.name, rtspUrl: form.rtspUrl, organizationId: form.organizationId, fps: form.fps, captureInterval: form.captureInterval };
      if (form.resolution) data.resolution = form.resolution;
      if (editingId) {
        await updateCamera(editingId, data);
        toast("Caméra mise à jour", "success");
      } else {
        await createCamera(data);
        toast("Caméra créée", "success");
      }
      resetForm();
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function handleToggleStream(camera: Camera) {
    try {
      if (activeStreams.includes(camera.id)) {
        await stopStream(camera.id);
        toast("Flux arrêté", "success");
      } else {
        await startStream(camera.id);
        toast("Flux démarré - capture en cours", "success");
      }
      fetchActiveStreams().then(setActiveStreams).catch(() => {});
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function handlePreview(camera: Camera) {
    setPreviewCamera(camera);
    setPreviewSnapshot(null);
    setPreviewLoading(true);
    try {
      const snapshot = await fetchCameraSnapshot(camera.id);
      setPreviewSnapshot(snapshot);
    } catch {
      setPreviewSnapshot(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleDeleteCamera(camera: Camera) {
    if (!confirm(t('cameras.confirmDelete').replace('{name}', camera.name))) return;
    try {
      await deleteCamera(camera.id);
      toast(t('cameras.deleted'), "success");
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function handleAddCameraFromScan(cameraData: any) {
    try {
      await createCamera(cameraData);
      toast("Caméra ajoutée", "success");
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  const cameraCount = camerasData.length;
  const limitReached = cameraCount >= MAX_CAMERAS;
  const addButtonLabel = limitReached
    ? "Limite de 10 caméras atteinte"
    : t('common.add');

  if (camerasError && camerasData.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-lg font-medium">{t('common.errorLoading')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{camerasError}</p>
          <Button variant="outline" className="mt-4" onClick={() => setRefreshKey((k) => k + 1)}>
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caméras"
        description={`${cameraCount} caméra${cameraCount > 1 ? 's' : ''} — ${camerasData.filter(c => c.status === 'ONLINE').length} en ligne`}
        action={{
          label: addButtonLabel,
          icon: Plus,
          onClick: () => {
            if (!limitReached) {
              setShowOnvifScan(true);
            } else {
              toast("Limite de 10 caméras atteinte. Passez au pack BASTION.", "warning");
            }
          },
        }}
      />

      {/* Camera limit banner */}
      {limitReached && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-2.5 text-xs text-warning flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Limite de {MAX_CAMERAS} caméras atteinte. Passez au pack BASTION pour débloquer plus de caméras.</span>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold">{editingId ? t('cameras.editCamera') : t('cameras.newCamera')}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t('cameras.name')}</label>
              <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t('cameras.url')}</label>
              <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-xs" required placeholder="rtsp://192.168.1.x:8080/h264_ultra.sdp" value={form.rtspUrl} onChange={(e) => setForm({ ...form, rtspUrl: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t('cameras.site')}</label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required value={form.organizationId} onChange={(e) => setForm({ ...form, organizationId: e.target.value })}>
                <option value="">{t('cameras.selectSite')}</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t('cameras.resolution')}</label>
              <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="1920x1080" value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t('cameras.captureInterval')}</label>
              <input type="number" min={1} max={60} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.captureInterval} onChange={(e) => setForm({ ...form, captureInterval: parseInt(e.target.value) || 5 })} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit">{editingId ? t('common.edit') : t('common.create')}</Button>
            <Button type="button" variant="outline" onClick={resetForm}>{t('common.cancel')}</Button>
          </div>
        </form>
      )}

      {liveCamera && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Radio className="h-4 w-4 text-red-500 animate-pulse" />
              {t('cameras.live')} - {liveCamera.name}
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setLiveCamera(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="w-full max-w-4xl">
              <VideoPlayer cameraId={liveCamera.id} cameraName={liveCamera.name} />
            </div>
          </CardContent>
        </Card>
      )}

      {selectedCamera && (
        <CameraPromptPanel camera={selectedCamera} onClose={() => { setSelectedCamera(null); setRefreshKey((k) => k + 1); }} />
      )}

      {previewCamera && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t('cameras.preview')} - {previewCamera.name}</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => { setPreviewCamera(null); setPreviewSnapshot(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-lg bg-black">
              {previewLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Video className="mx-auto mb-2 h-8 w-8 animate-pulse" />
                    <p className="text-sm">{t('cameras.capturing')}</p>
                  </div>
                </div>
              ) : previewSnapshot ? (
                <img src={`data:image/jpeg;base64,${previewSnapshot}`} alt={`Snapshot ${previewCamera.name}`} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <p className="text-sm">{t('cameras.captureError')}</p>
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handlePreview(previewCamera)}>{t('cameras.refresh')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('cameras.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5 bg-muted/30">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 h-8"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grille
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 h-8"
              onClick={() => setViewMode("list")}
            >
              <List className="h-3.5 w-3.5" />
              Liste
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusPills.map((pill) => (
          <Button
            key={pill.value}
            variant={statusFilter === pill.value ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setStatusFilter(pill.value)}
          >
            {pill.label}
          </Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {viewMode === "grid" ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <LiveCameraGrid
              cameras={filteredCameras}
              loading={camerasLoading}
              error={camerasError}
              onRetry={() => setRefreshKey((k) => k + 1)}
              onAddCamera={() => setShowOnvifScan(true)}
              maxCameras={MAX_CAMERAS}
            />
            {!camerasLoading && filteredCameras.length === 0 && (debouncedSearch || statusFilter) && (
              <div className="flex justify-center mt-4">
                <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setDebouncedSearch(""); setStatusFilter(""); }}>
                  {t('cameras.resetFilters')}
                </Button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCameras.map((camera) => (
                <CameraCardPremium
                  key={camera.id}
                  camera={camera}
                  onClick={(id) => window.location.href = `/cameras/${id}`}
                />
              ))}
              {!camerasLoading && filteredCameras.length === 0 && (
                <div className="col-span-full flex justify-center mt-4">
                  <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setDebouncedSearch(""); setStatusFilter(""); }}>
                    {t('cameras.resetFilters')}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CameraPromptPanel({ camera, onClose }: { camera: Camera; onClose: () => void }) {
  const { t } = useTranslation();
  const [prompts, setPrompts] = useState<CameraPrompt[]>([]);
  const [newPrompt, setNewPrompt] = useState("");
  const [newSeverity, setNewSeverity] = useState("MEDIUM");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchCameraPrompts(camera.id)
      .then((data) => { setPrompts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [camera.id]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newPrompt.trim()) return;
    try {
      const p = await addCameraPrompt(camera.id, { text: newPrompt, severity: newSeverity });
      setPrompts([p, ...prompts]);
      setNewPrompt("");
      toast(t('cameras.promptAdded'), "success");
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function handleToggle(p: CameraPrompt) {
    try {
      const updated = await updateCameraPrompt(camera.id, p.id, { isActive: !p.isActive });
      setPrompts(prompts.map((x) => (x.id === p.id ? updated : x)));
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function handleDelete(p: CameraPrompt) {
    try {
      await deleteCameraPrompt(camera.id, p.id);
      setPrompts(prompts.filter((x) => x.id !== p.id));
      toast(t('cameras.promptDeleted'), "success");
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{t('cameras.prompts')} - {camera.name}</CardTitle>
        <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAdd} className="mb-4 space-y-2">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder={t('cameras.promptPlaceholder')}
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
            />
            <Button type="submit" size="sm">{t('common.add')}</Button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">{t('cameras.severity')} :</span>
            {["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((sev) => (
              <Button
                key={sev}
                type="button"
                variant={newSeverity === sev ? "default" : "outline"}
                size="sm"
                className="text-xs px-2 py-1 h-7"
                onClick={() => setNewSeverity(sev)}
              >
                {sev}
              </Button>
            ))}
          </div>
        </form>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : prompts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('cameras.noPrompts')}</p>
        ) : (
          <div className="space-y-2">
            {prompts.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="flex-1">
                  <p className="text-sm">{p.text}</p>
                  <div className="mt-1 flex gap-2">
                    <Badge variant={p.isActive ? "success" : "secondary"}>{p.isActive ? t('cameras.active') : t('cameras.inactive')}</Badge>
                    <Badge variant="outline">{p.severity}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleToggle(p)}>
                    {p.isActive ? t('cameras.disable') : t('cameras.enable')}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(p)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
