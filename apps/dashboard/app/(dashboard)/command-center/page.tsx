"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { AlertTriangle, Activity } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { ChatPanel } from "@/components/chat-panel";
import { AgentStatusBar } from "@/components/agent-status-bar";
import { CameraGrid } from "@/components/camera-grid";
import { RiskGauge } from "@/components/risk-gauge";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { DonutChart } from "@/components/donut-chart";
import { ActivityTimeline } from "@/components/activity-timeline";
import { CommandCenterFeed } from "@/components/command-center/CommandCenterFeed";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/use-auth";
import {
  getAgentStatus,
  fetchCameras,
  fetchRiskScores,
  fetchAlerts,
  type Camera,
  type RiskScoreDto,
  type Alert,
  type AgentStatusResponse,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";

interface AgentInfo {
  name: string;
  status: "idle" | "thinking" | "responding" | "error";
  model?: string;
}

interface CameraThumbnail {
  id: string;
  name: string;
  status: "ONLINE" | "OFFLINE" | "MAINTENANCE" | "DEGRADED";
  snapshotUrl?: string | null;
}

interface ConfirmAction {
  id: string;
  title: string;
  description: string;
  confirmLabel: string;
  action: string;
  params: unknown;
}

export default function CommandCenterPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [sessionId] = useState(
    () => Math.random().toString(36).substring(2) + Date.now().toString(36)
  );
  const [agents, setAgents] = useState<AgentInfo[]>([
    { name: "Orchestrateur", status: "idle", model: "mistral" },
    { name: "RiskAnalysisAgent", status: "idle", model: "mistral" },
    { name: "PatternRecognitionAgent", status: "idle", model: "mistral" },
    { name: "CameraAnalysisAgent", status: "idle", model: "llava" },
    { name: "DatabaseQueryAgent", status: "idle", model: "mistral" },
    { name: "NotificationAgent", status: "idle", model: "mistral" },
  ]);
  const [cameras, setCameras] = useState<CameraThumbnail[]>([]);
  const [riskScores, setRiskScores] = useState<RiskScoreDto[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [modelHealth, setModelHealth] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFeed, setShowFeed] = useState(false);
  const [feedNewEvents, setFeedNewEvents] = useState(0);

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [agentStatusRes, camerasRes, riskRes, alertsRes] =
          await Promise.all([
            getAgentStatus().catch(() => null),
            fetchCameras({ limit: 20 }).catch(() => null),
            fetchRiskScores().catch(() => null),
            fetchAlerts({ limit: 20 }).catch(() => null),
          ]);

        // Update agent statuses from API
        if (agentStatusRes) {
          setModelHealth(agentStatusRes.modelStatus || {});
          setAgents((prev) =>
            prev.map((agent) => ({
              ...agent,
              status: agentStatusRes.ollamaAvailable
                ? "idle"
                : "error",
            }))
          );
        }

        // Map cameras
        if (camerasRes && "data" in camerasRes) {
          const camData = camerasRes.data as Camera[];
          setCameras(
            camData.map((c) => ({
              id: c.id,
              name: c.name,
              status: c.status,
              snapshotUrl: c.lastSnapshotUrl,
            }))
          );
        }

        if (riskRes && Array.isArray(riskRes)) {
          setRiskScores(riskRes as RiskScoreDto[]);
        }

        if (alertsRes && "data" in alertsRes) {
          setAlerts(alertsRes.data as Alert[]);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();

    // Refresh every 60s
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Overall organization risk score
  const overallRiskScore = riskScores.length > 0
    ? Math.round(
        riskScores.reduce((sum, s) => sum + s.smoothedScore, 0) /
          riskScores.length
      )
    : 0;

  // Alert severity distribution for DonutChart
  const alertDistribution = [
    {
      name: "Critique",
      value: alerts.filter((a) => a.severity === "CRITICAL").length,
      color: "#ef4444",
    },
    {
      name: "Élevé",
      value: alerts.filter((a) => a.severity === "HIGH").length,
      color: "#f59e0b",
    },
    {
      name: "Moyen",
      value: alerts.filter((a) => a.severity === "MEDIUM").length,
      color: "#06b6d4",
    },
    {
      name: "Faible",
      value: alerts.filter((a) => a.severity === "LOW" || a.severity === "INFO").length,
      color: "#94a3b8",
    },
  ].filter((d) => d.value > 0);

  // Model status label
  const allModelsOk = Object.keys(modelHealth).length > 0
    ? Object.values(modelHealth).every(Boolean)
    : true;

  // Handle destructive action confirmation from chat
  const handleActionConfirm = (action: string, params: unknown) => {
    const confirmData: ConfirmAction = {
      id: Date.now().toString(),
      title: `Confirmer l'action: ${action}`,
      description: `Cette action va modifier l'état du système. Êtes-vous sûr de vouloir continuer ?`,
      confirmLabel: "Exécuter",
      action,
      params,
    };
    setConfirmAction(confirmData);
  };

  const handleConfirmExecute = async () => {
    if (!confirmAction) return;
    setIsConfirming(true);
    try {
      // The actual action execution would go through the agent SSE stream
      // For now, just close the dialog
      setConfirmAction(null);
    } finally {
      setIsConfirming(false);
    }
  };

  if (error && !isLoading) {
    return (
      <PageTransition>
        <div className="flex flex-col gap-6">
          <PageHeader title="Centre de commande" />
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-2">
              Réessayer
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between pb-6">
          <PageHeader title="Centre de commande" />
          <div className="flex items-center gap-2">
            <Button
              variant={showFeed ? "default" : "secondary"}
              size="sm"
              onClick={() => setShowFeed(!showFeed)}
              className="relative"
            >
              <Activity className="h-4 w-4 mr-1.5" />
              Flux temps réel
              {!showFeed && feedNewEvents > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[9px] font-bold flex items-center justify-center text-white">
                  {feedNewEvents > 9 ? "9+" : feedNewEvents}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Feed panel (collapsible) */}
        {showFeed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden rounded-lg border border-border"
          >
            <div className="h-[320px] lg:h-[calc(100vh-16rem)]">
              <CommandCenterFeed
                onNewEventCount={setFeedNewEvents}
              />
            </div>
          </motion.div>
        )}

        {/* 3-panel layout */}
        <div className="grid gap-4 lg:grid-cols-[20%_1fr_30%]">
          {/* LEFT PANEL: Agent Status + Risk */}
          <div className="flex flex-col gap-4">
            {/* Model Health Indicator */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/60 border border-border/40">
              <div
                className={`h-2 w-2 rounded-full ${
                  allModelsOk ? "bg-green-500" : "bg-amber-500"
                }`}
              />
              <span className="text-xs font-medium">
                {allModelsOk
                  ? "Modèles connectés"
                  : "Modèles dégradés"}
              </span>
            </div>

            {/* Agent Status Bar */}
            <AgentStatusBar agents={agents} />

            {/* Risk Gauge */}
            <RiskGauge
              score={overallRiskScore}
              zoneName="Organisation"
              size={180}
            />
          </div>

          {/* CENTER PANEL: Chat */}
          <div className="min-h-[600px] lg:min-h-[calc(100vh-12rem)]">
            <ChatPanel
              sessionId={sessionId}
              onActionConfirm={handleActionConfirm}
              className="h-full"
            />
          </div>

          {/* RIGHT PANEL: Camera Grid + Alert Distribution + Activity */}
          <div className="flex flex-col gap-4">
            {/* Camera Grid */}
            <CameraGrid
              cameras={cameras}
              onCameraClick={(cameraId) => {
                // Could open camera detail modal — no-op for now
              }}
            />

            {/* Alert Severity Donut */}
            {alertDistribution.length > 0 && (
              <DonutChart
                data={alertDistribution}
                size={180}
                className="p-3"
              />
            )}

            {/* Activity Timeline */}
            <ActivityTimeline
              alerts={alerts}
              maxItems={5}
            />
          </div>
        </div>

        {/* Mobile: stack vertically */}
        <div className="grid gap-4 lg:hidden">
          {/* Center panel on mobile = chat first */}
          <div className="min-h-[400px]">
            <ChatPanel
              sessionId={sessionId}
              onActionConfirm={handleActionConfirm}
              className="h-full"
            />
          </div>

          <AgentStatusBar agents={agents} />
          <CameraGrid
            cameras={cameras}
            onCameraClick={(cameraId) => {
              // Could open camera detail modal — no-op for now
            }}
          />
        </div>

        {/* Disclaimer */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          L&apos;IA peut produire des informations incorrectes. Vérifiez les
          décisions critiques.
        </div>

        {/* Confirmation Dialog for destructive actions */}
        {confirmAction && (
          <ConfirmationDialog
            isOpen={true}
            title={confirmAction.title}
            description={confirmAction.description}
            confirmLabel={confirmAction.confirmLabel}
            onConfirm={handleConfirmExecute}
            onCancel={() => setConfirmAction(null)}
            requiredRole="SUPERVISOR"
            userRole={user?.role}
            isLoading={isConfirming}
          />
        )}
      </div>
    </PageTransition>
  );
}
