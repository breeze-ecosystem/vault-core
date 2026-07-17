"use client";

import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  aiQuery,
  aiAssistant,
  aiSummarize,
  aiStatus,
  fetchIncidents,
  type AIQueryResultDto,
  type AssistantResponseDto,
  type AIIncidentSummaryDto,
  type AIStatusDto,
  type IncidentDto,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";
import {
  Send,
  Bot,
  User,
  Search,
  FileText,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Circle,
  Zap,
} from "lucide-react";

type Tab = "query" | "assistant" | "summaries";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { type: string; time: string; summary: string }[];
  result?: AIQueryResultDto;
}

export default function AiAssistantPage() {
  const { t } = useTranslation();
  const dict = (t as any)?.ai || {};

  const [activeTab, setActiveTab] = useState<Tab>("query");
  const [status, setStatus] = useState<AIStatusDto | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Query mode state
  const [queryInput, setQueryInput] = useState("");
  const [queryMessages, setQueryMessages] = useState<Message[]>([]);
  const [queryLoading, setQueryLoading] = useState(false);

  // Assistant mode state
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<Message[]>([]);
  const [assistantLoading, setAssistantLoading] = useState(false);

  // Summaries mode state
  const [incidents, setIncidents] = useState<IncidentDto[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [summaryResult, setSummaryResult] = useState<AIIncidentSummaryDto | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [incidentsLoading, setIncidentsLoading] = useState(false);

  const queryEndRef = useRef<HTMLDivElement>(null);
  const assistantEndRef = useRef<HTMLDivElement>(null);

  // Load system status on mount
  useEffect(() => {
    aiStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setStatusLoading(false));
  }, []);

  // Auto-scroll for chat modes
  useEffect(() => {
    queryEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [queryMessages]);

  useEffect(() => {
    assistantEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [assistantMessages]);

  // Load incidents for summary tab
  useEffect(() => {
    if (activeTab === "summaries") {
      setIncidentsLoading(true);
      fetchIncidents({ status: "closed,resolved", limit: 50 })
        .then((res) => setIncidents(res.data || []))
        .catch(() => {})
        .finally(() => setIncidentsLoading(false));
    }
  }, [activeTab]);

  // ── Query Mode ──

  const handleQuerySubmit = async () => {
    const q = queryInput.trim();
    if (!q || queryLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: q };
    setQueryMessages((prev) => [...prev, userMsg]);
    setQueryInput("");
    setQueryLoading(true);

    try {
      const result = await aiQuery(q);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.summary || `${result.results?.length || 0} événement(s) trouvé(s)`,
        result,
      };
      if (result.spec?.query_summary) {
        assistantMsg.content = `**${result.spec.query_summary}**: ${result.results?.length || 0} résultat(s)`;
      }
      setQueryMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setQueryMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `${t('common.error')}: ${err.message}`,
        },
      ]);
    } finally {
      setQueryLoading(false);
    }
  };

  // ── Assistant Mode ──

  const handleAssistantSubmit = async () => {
    const q = assistantInput.trim();
    if (!q || assistantLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: q };
    setAssistantMessages((prev) => [...prev, userMsg]);
    setAssistantInput("");
    setAssistantLoading(true);

    try {
      const result = await aiAssistant(q);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.answer,
        sources: result.sources,
      };
      setAssistantMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `${t('common.error')}: ${err.message}`,
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  // ── Summary Mode ──

  const handleGenerateSummary = async () => {
    if (!selectedIncidentId || summaryLoading) return;
    setSummaryLoading(true);
    setSummaryResult(null);

    try {
      const result = await aiSummarize(selectedIncidentId);
      setSummaryResult(result);
    } catch (err: any) {
      setSummaryResult({
        summary: `${t('common.error')}: ${err.message}`,
        keyEvents: [],
        recommendedActions: [],
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  // ── Example Queries ──

  const exampleQueries = dict.query?.examples || [
    "Montrer les intrusions après 20h sur le Site A",
    "Événements de porte forcée aujourd'hui",
    "Quels véhicules sont passés ce matin ?",
    "Alertes de la dernière heure",
  ];

  const suggestionQuestions = dict.assistant?.suggestions
    ? ["Combien de caméras sont en ligne ?", "Quel est l'état du Site A ?", "Montre-moi les incidents récents"]
    : ["How many cameras are online?", "What is the status of Site A?", "Show me recent incidents"];

  // Status indicator
  const StatusIndicator = () => {
    if (statusLoading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          {dict.status?.checking || "Checking..."}
        </div>
      );
    }

    const connected = status?.ollamaConnected;
    return (
      <div className="flex items-center gap-2 text-sm">
        <Circle
          className={`h-3 w-3 ${connected ? "fill-green-500 text-green-500" : "fill-red-500 text-red-500"}`}
        />
        <span className={connected ? "text-green-500" : "text-red-500"}>
          {connected ? dict.status?.connected || "Connected" : dict.status?.disconnected || "Disconnected"}
        </span>
      </div>
    );
  };

  // Tabs configuration
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "query", label: dict.tabs?.query || "Requête naturelle", icon: <Search className="h-4 w-4" /> },
    { key: "assistant", label: dict.tabs?.assistant || "Assistant", icon: <Bot className="h-4 w-4" /> },
    { key: "summaries", label: dict.tabs?.summaries || "Résumés d'incidents", icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={dict.title || "Assistant IA"}
      />

      <StatusIndicator />

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex flex-col gap-4">
        {/* Mode 1: Natural Language Query */}
        {activeTab === "query" && (
          <Card>
            <CardContent className="pt-4">
              {/* Chat Messages */}
              <div className="flex flex-col gap-4 mb-4 max-h-[400px] overflow-y-auto">
                {queryMessages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{dict.query?.input || "Posez une question sur les événements de sécurité..."}</p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {exampleQueries.map((ex: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => {
                            setQueryInput(ex);
                          }}
                          className="text-xs bg-muted px-3 py-1.5 rounded-full hover:bg-muted/80 transition-colors"
                        >
                          {ex}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {queryMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="mt-1">
                        <Bot className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                      {/* Show results if available */}
                      {msg.result?.results && msg.result.results.length > 0 && (
                        <div className="mt-3 space-y-2 border-t pt-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            {msg.result.results.length} événement(s)
                          </p>
                          {msg.result.results.slice(0, 5).map((r: any, i: number) => (
                            <div key={i} className="text-xs bg-background rounded p-2">
                              <div className="flex justify-between">
                                <span className="font-medium">{r.event_type}</span>
                                <span className="text-muted-foreground">
                                  {r.time ? new Date(r.time).toLocaleString("fr-FR") : ""}
                                </span>
                              </div>
                              <p className="text-muted-foreground mt-1">{r.summary}</p>
                            </div>
                          ))}
                          {msg.result.results.length > 5 && (
                            <p className="text-xs text-muted-foreground">
                              +{msg.result.results.length - 5} autre(s)...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="mt-1">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                    )}
                  </div>
                ))}
                {queryLoading && (
                  <div className="flex gap-3">
                    <Bot className="h-6 w-6 text-primary mt-1" />
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {dict.query?.searching || "Recherche..."}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={queryEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQuerySubmit()}
                  placeholder={dict.query?.input || "Posez une question..."}
                  className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button onClick={handleQuerySubmit} disabled={queryLoading || !queryInput.trim()}>
                  {queryLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mode 2: AI Assistant */}
        {activeTab === "assistant" && (
          <Card>
            <CardContent className="pt-4">
              {/* Chat Messages */}
              <div className="flex flex-col gap-4 mb-4 max-h-[400px] overflow-y-auto">
                {assistantMessages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{dict.assistant?.input || "Posez une question sur l'état du système..."}</p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {suggestionQuestions.map((q: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => setAssistantInput(q)}
                          className="text-xs bg-muted px-3 py-1.5 rounded-full hover:bg-muted/80 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {assistantMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="mt-1">
                        <Bot className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 border-t pt-2">
                          <button
                            onClick={() => {
                              const el = document.getElementById(`sources-${msg.id}`);
                              if (el) el.classList.toggle("hidden");
                            }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <ChevronDown className="h-3 w-3" />
                            {dict.assistant?.sources || "Sources"} ({msg.sources.length})
                          </button>
                          <div id={`sources-${msg.id}`} className="hidden mt-2 space-y-1">
                            {msg.sources.map((s, i) => (
                              <div key={i} className="text-xs bg-background rounded p-2">
                                <span className="font-medium">{s.type}</span>
                                <span className="text-muted-foreground ml-2">
                                  {new Date(s.time).toLocaleString("fr-FR")}
                                </span>
                                <p className="text-muted-foreground">{s.summary}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="mt-1">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                    )}
                  </div>
                ))}
                {assistantLoading && (
                  <div className="flex gap-3">
                    <Bot className="h-6 w-6 text-primary mt-1" />
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {dict.assistant?.thinking || "Réflexion..."}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={assistantEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAssistantSubmit()}
                  placeholder={dict.assistant?.input || "Posez une question..."}
                  className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button onClick={handleAssistantSubmit} disabled={assistantLoading || !assistantInput.trim()}>
                  {assistantLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mode 3: Incident Summaries */}
        {activeTab === "summaries" && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <select
                    value={selectedIncidentId}
                    onChange={(e) => setSelectedIncidentId(e.target.value)}
                    className="w-full rounded-lg border bg-background px-4 py-2 text-sm"
                  >
                    <option value="">{dict.summaries?.selectIncident || "Sélectionner un incident"}</option>
                    {incidents
                      .filter((inc) => inc.status === "closed" || inc.status === "resolved")
                      .map((inc) => (
                        <option key={inc.id} value={inc.id}>
                          {inc.title} ({inc.status})
                        </option>
                      ))}
                  </select>
                  {incidents.filter((inc) => inc.status === "closed" || inc.status === "resolved").length === 0 &&
                    !incidentsLoading && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {dict.summaries?.noIncidents || "Aucun incident résolu ou fermé"}
                      </p>
                    )}
                </div>
                <Button
                  onClick={handleGenerateSummary}
                  disabled={!selectedIncidentId || summaryLoading}
                >
                  {summaryLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {dict.summaries?.generating || "Génération..."}
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      {dict.summaries?.generate || "Générer le résumé"}
                    </>
                  )}
                </Button>
              </div>

              {/* Summary Result */}
              {summaryResult && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-sm font-medium mb-2">
                      {dict.summaries?.summary || "Résumé"}
                    </h3>
                    <p className="text-sm whitespace-pre-wrap">{summaryResult.summary}</p>
                  </div>

                  {/* Key Events */}
                  {summaryResult.keyEvents.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">
                        {dict.summaries?.keyEvents || "Événements clés"}
                      </h3>
                      <div className="space-y-1">
                        {summaryResult.keyEvents.map((event, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-1">•</span>
                            <span>{event}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Actions */}
                  {summaryResult.recommendedActions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">
                        {dict.summaries?.recommendedActions || "Actions recommandées"}
                      </h3>
                      <div className="space-y-1">
                        {summaryResult.recommendedActions.map((action, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                            <span>{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
        <AlertTriangle className="h-3 w-3 shrink-0" />
        {dict.disclaimer || "L'IA peut faire des erreurs. Vérifiez les informations critiques."}
      </div>
    </div>
  );
}
