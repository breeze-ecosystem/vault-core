"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import {
  fetchCameras,
  fetchSites,
  createCamera,
  updateCamera,
  startStream,
  stopStream,
  fetchActiveStreams,
  addCameraPrompt,
  updateCameraPrompt,
  deleteCameraPrompt,
  type Camera,
  type Site,
  type CameraPrompt,
} from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { Plus, Video, Settings, X, Play, Square } from "lucide-react";

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
  DEGRADED: "Degrade",
};

export default function CamerasPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [activeStreams, setActiveStreams] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({ name: "", rtspUrl: "", siteId: "", resolution: "", fps: 25, captureInterval: 5 });

  useEffect(() => {
    fetchSites({ limit: 100 }).then((r) => setSites(r.data)).catch(() => {});
    fetchActiveStreams().then(setActiveStreams).catch(() => {});
  }, [refreshKey]);

  function resetForm() {
    setForm({ name: "", rtspUrl: "", siteId: "", resolution: "", fps: 25, captureInterval: 5 });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(camera: Camera) {
    setForm({
      name: camera.name,
      rtspUrl: camera.rtspUrl,
      siteId: camera.siteId,
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
      const data: any = { name: form.name, rtspUrl: form.rtspUrl, siteId: form.siteId, fps: form.fps, captureInterval: form.captureInterval };
      if (form.resolution) data.resolution = form.resolution;
      if (editingId) {
        await updateCamera(editingId, data);
        toast("Camera mise a jour", "success");
      } else {
        await createCamera(data);
        toast("Camera creee", "success");
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
        toast("Flux arrete", "success");
      } else {
        await startStream(camera.id);
        toast("Flux demarre - capture en cours", "success");
      }
      fetchActiveStreams().then(setActiveStreams).catch(() => {});
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  const filters: Record<string, string> | undefined = statusFilter ? { status: statusFilter } : undefined;

  return (
    <div>
      <PageHeader
        title="Cameras"
        description="Gestion des cameras et flux video"
        action={{ label: "Ajouter", icon: Plus, onClick: () => { resetForm(); setShowForm(true); } }}
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold">{editingId ? "Modifier la camera" : "Nouvelle camera"}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Nom</label>
              <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">URL RTSP</label>
              <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-xs" required placeholder="rtsp://192.168.1.x:8080/h264_ultra.sdp" value={form.rtspUrl} onChange={(e) => setForm({ ...form, rtspUrl: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Site</label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })}>
                <option value="">Selectionner un site</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Resolution</label>
              <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="1920x1080" value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Intervalle capture (s)</label>
              <input type="number" min={1} max={60} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.captureInterval} onChange={(e) => setForm({ ...form, captureInterval: parseInt(e.target.value) || 5 })} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit">{editingId ? "Modifier" : "Creer"}</Button>
            <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
          </div>
        </form>
      )}

      {selectedCamera && (
        <CameraPromptPanel camera={selectedCamera} onClose={() => { setSelectedCamera(null); setRefreshKey((k) => k + 1); }} />
      )}

      <div className="mb-4 flex gap-2">
        {["", "ONLINE", "OFFLINE", "MAINTENANCE", "DEGRADED"].map((s) => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)}>
            {s ? statusLabels[s] : "Toutes"}
          </Button>
        ))}
      </div>

      <DataTable
        key={refreshKey}
        columns={[
          { key: "name", label: "Camera", render: (c: Camera) => (
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{c.rtspUrl}</p>
              </div>
            </div>
          )},
          { key: "site", label: "Site", render: (c: Camera) => c.site?.name ?? "—" },
          { key: "status", label: "Statut", render: (c: Camera) => (
            <Badge variant={statusColors[c.status]}>{statusLabels[c.status] ?? c.status}</Badge>
          )},
          { key: "stream", label: "Flux", render: (c: Camera) => (
            <Badge variant={activeStreams.includes(c.id) ? "success" : "secondary"}>
              {activeStreams.includes(c.id) ? "En cours" : "Arrete"}
            </Badge>
          )},
          { key: "actions", label: "", render: (c: Camera) => (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant={activeStreams.includes(c.id) ? "destructive" : "default"} onClick={() => handleToggleStream(c)}>
                {activeStreams.includes(c.id) ? <Square className="mr-1 h-3 w-3" /> : <Play className="mr-1 h-3 w-3" />}
                {activeStreams.includes(c.id) ? "Arreter" : "Demarrer"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedCamera(c)}>
                <Settings className="mr-1 h-3 w-3" /> Prompts
              </Button>
              <Button size="sm" variant="ghost" onClick={() => startEdit(c)}>Modifier</Button>
            </div>
          )},
        ]}
        fetchFn={fetchCameras}
        filters={filters}
      />
    </div>
  );
}

function CameraPromptPanel({ camera, onClose }: { camera: Camera; onClose: () => void }) {
  const [prompts, setPrompts] = useState<CameraPrompt[]>([]);
  const [newPrompt, setNewPrompt] = useState("");
  const [newSeverity, setNewSeverity] = useState("MEDIUM");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://oversight-api.digitsoftafrica.com"}/api/cameras/${camera.id}/prompts`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem("accessToken")}` },
    })
      .then((r) => r.json())
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
      toast("Prompt ajoute", "success");
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
      toast("Prompt supprime", "success");
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Prompts - {camera.name}</CardTitle>
        <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAdd} className="mb-4 space-y-2">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Ex: Alerter si quelqu'un entre sans casque de securite"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
            />
            <Button type="submit" size="sm">Ajouter</Button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Severite:</span>
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
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : prompts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun prompt. Ajoutez des prompts en langage naturel pour que l&apos;IA analyse les images.</p>
        ) : (
          <div className="space-y-2">
            {prompts.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="flex-1">
                  <p className="text-sm">{p.text}</p>
                  <div className="mt-1 flex gap-2">
                    <Badge variant={p.isActive ? "success" : "secondary"}>{p.isActive ? "Actif" : "Inactif"}</Badge>
                    <Badge variant="outline">{p.severity}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleToggle(p)}>
                    {p.isActive ? "Desactiver" : "Activer"}
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
