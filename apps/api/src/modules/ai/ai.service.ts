import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import type { AIQueryResult, AIQuerySpec, AssistantResponse } from "@repo/shared";

interface TimelineEntry {
  time: string;
  event_type: string;
  site_id: string;
  door_id?: string;
  door_name?: string;
  credential_id?: string;
  user_name?: string;
  decision?: string;
  summary: string;
  camera_id?: string;
  snapshot_url?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ollamaUrl: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    @InjectQueue("ai-summaries") private aiQueue: Queue,
  ) {
    this.ollamaUrl = this.config.get<string>("ollamaBaseUrl", "http://localhost:11434");
  }

  // ── 1. Natural Language Query (AI-01) ──

  async naturalLanguageQuery(query: string, userId: string): Promise<AIQueryResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { siteId: true },
    });

    const siteId = user?.siteId;

    // Build system prompt for structured output
    const systemPrompt = `You are a security system query interpreter. Convert natural language queries about security events into structured JSON.

Current time: ${new Date().toISOString()}
User's site ID: ${siteId || "unknown (use site_name filter if specified)"}

Valid event_types: access_granted, access_denied, door_forced, door_held_open, door_unsecured, tailgating, anpr_allow, anpr_deny
Valid filter fields: site_name (string), from_time (ISO8601), to_time (ISO8601), door_name (string), plate (string)

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "event_types": ["string"],
  "filters": { "site_name": "string or null", "from_time": "ISO8601 or null", "to_time": "ISO8601 or null", "door_name": "string or null", "plate": "string or null" },
  "query_summary": "brief French description of what was queried"
}`;

    let spec: AIQuerySpec;
    try {
      const response = await this.callOllama(
        this.config.get<string>("ai.ollamaModel", "moondream"),
        systemPrompt,
        `Query: "${query}"\n\nJSON:`,
      );

      spec = this.parseQueryResponse(response);
    } catch (err: any) {
      this.logger.warn(`Ollama NL query failed: ${err.message}`);
      return {
        query,
        spec: { event_types: [], filters: {}, query_summary: "Erreur d'interprétation de la requête" },
        results: [],
        summary: "L'assistant IA n'a pas pu traiter votre requête. Veuillez réessayer.",
      };
    }

    // Resolve site name to site ID
    let resolvedSiteId = siteId;
    if (spec.filters.site_name && !resolvedSiteId) {
      const site = await this.prisma.site.findFirst({
        where: { name: { contains: spec.filters.site_name, mode: "insensitive" } },
        select: { id: true },
      });
      if (site) resolvedSiteId = site.id;
    }

    // Execute TimescaleDB query based on spec
    const results = await this.executeEventQuery(spec, resolvedSiteId);

    // Generate summary
    let summary = `${results.length} événement(s) trouvé(s)`;
    if (spec.query_summary) {
      summary = `${spec.query_summary}: ${results.length} résultat(s)`;
    }

    return { query, spec, results, summary };
  }

  // ── 2. Generate Incident Summary (AI-02) ──

  async generateIncidentSummary(incidentId: string): Promise<{
    summary: string;
    keyEvents: string[];
    recommendedActions: string[];
  }> {
    // Fetch incident with full context
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        comments: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: "asc" },
        },
        evidence: {
          include: { uploadedBy: { select: { firstName: true, lastName: true } } },
        },
        alert: { select: { id: true, title: true, severity: true } },
      },
    });

    if (!incident) {
      return { summary: "Incident non trouvé", keyEvents: [], recommendedActions: [] };
    }

    // Fetch status history from incident_events hypertable
    let statusHistory: string[] = [];
    try {
      const rows = await this.prisma.$queryRaw<Array<{
        time: Date;
        status: string;
        previous_status: string | null;
      }>>`
        SELECT time, status, previous_status
        FROM incident_events
        WHERE incident_id = ${incidentId}::uuid
        ORDER BY time ASC
      `;
      statusHistory = rows.map(
        (r) => `${r.time.toISOString()}: ${r.previous_status || "CREATED"} → ${r.status}`,
      );
    } catch (err: any) {
      this.logger.warn(`Could not query incident_events: ${err.message}`);
    }

    const context = {
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
      createdAt: incident.createdAt.toISOString(),
      resolvedAt: incident.closedAt?.toISOString() || incident.updatedAt.toISOString(),
      assignee: incident.assignedTo
        ? `${incident.assignedTo.firstName} ${incident.assignedTo.lastName}`
        : "Non assigné",
      statusHistory: statusHistory.join("\n") || "Aucun historique",
      comments: incident.comments
        .map((c) => `${c.user?.firstName}: ${c.text}`)
        .join("\n") || "Aucun commentaire",
      evidenceCount: incident.evidence.length,
      evidenceTypes: [...new Set(incident.evidence.map((e) => e.type))].join(", "),
      sourceAlert: incident.alert?.title || "Manuel",
    };

    const prompt = `Génère un résumé d'incident concis en français. Inclus:
1. Ce qui s'est passé (heure, lieu, personnes impliquées)
2. Chronologie des événements
3. Actions prises
4. Preuves associées (types et nombre)
5. Actions de suivi recommandées

Incident: ${JSON.stringify(context, null, 2)}

Réponds en JSON:
{
  "summary": "résumé complet en français",
  "keyEvents": ["liste des événements clés"],
  "recommendedActions": ["actions recommandées"]
}`;

    try {
      const response = await this.callOllama(
        this.config.get<string>("ai.summaryModel", "moondream"),
        "Tu es un assistant spécialisé dans les rapports de sécurité. Réponds uniquement en JSON valide.",
        prompt,
      );

      const parsed = JSON.parse(response);
      return {
        summary: parsed.summary || "Résumé non disponible",
        keyEvents: parsed.keyEvents || [],
        recommendedActions: parsed.recommendedActions || [],
      };
    } catch (err: any) {
      this.logger.error(`Summary generation failed: ${err.message}`);
      return {
        summary: `Incident ${incident.title} — ${incident.status}. ${incident.evidence.length} pièce(s) de preuve. Assigné à ${context.assignee}.`,
        keyEvents: statusHistory,
        recommendedActions: ["Vérifier les détails de l'incident dans le système"],
      };
    }
  }

  // ── 3. AI Assistant Question Answering (AI-03, RAG) ──

  async answerQuestion(question: string, userId: string): Promise<AssistantResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { siteId: true },
    });
    const siteId = user?.siteId;

    // Generate embedding for the question
    let embedding: number[] = [];
    try {
      embedding = await this.generateEmbedding(question);
    } catch (err: any) {
      this.logger.warn(`Embedding generation failed: ${err.message}`);
    }

    // Search semantically similar events if embedding available
    let similarEvents: Array<{ event_type: string; summary: string; time: Date; similarity: number }> = [];
    if (embedding.length > 0) {
      try {
        similarEvents = await this.prisma.$queryRawUnsafe<
          Array<{ event_type: string; summary: string; time: Date; similarity: number }>
        >(
          `SELECT event_type, summary, time,
                  embedding <=> $1::vector AS similarity
           FROM event_embeddings
           WHERE time >= NOW() - INTERVAL '7 days'
           ORDER BY embedding <=> $1::vector
           LIMIT 5`,
          `[${embedding.join(",")}]`,
        );
      } catch (err: any) {
        this.logger.warn(`pgvector query failed: ${err.message}`);
      }
    }

    // Get current system state
    let systemState = "";
    try {
      const [cameraCount, openAlerts, openIncidents, activeVisitors, siteCount] = await Promise.all([
        this.prisma.camera.groupBy({ by: ["status"], _count: true }),
        this.prisma.alert.count({ where: { status: "OPEN" } }),
        this.prisma.incident.count({
          where: { status: { notIn: ["resolved", "closed"] } },
        }),
        this.prisma.visit.count({ where: { status: "active" } }),
        this.prisma.site.findMany({
          select: { id: true, name: true, _count: { select: { cameras: true, doors: true } } },
        }),
      ]);

      const online = cameraCount.find((c) => c.status === "ONLINE")?._count || 0;
      const offline = cameraCount.find((c) => c.status === "OFFLINE")?._count || 0;
      const total = cameraCount.reduce((acc, c) => acc + c._count, 0);

      systemState = `État actuel du système:
- Caméras: ${total} total (${online} en ligne, ${offline} hors ligne)
- Alertes ouvertes: ${openAlerts}
- Incidents actifs: ${openIncidents}
- Visiteurs actifs: ${activeVisitors}
- Sites: ${siteCount.map((s) => s.name).join(", ")}`;
    } catch (err: any) {
      this.logger.warn(`Could not fetch system state: ${err.message}`);
      systemState = "État du système non disponible";
    }

    // Build sources from similar events
    const sources = similarEvents.map((e) => ({
      type: e.event_type,
      time: e.time.toISOString(),
      summary: e.summary,
    }));

    // Build context for LLM
    const context = `Contexte système:
${systemState}

Événements similaires récents:
${similarEvents.length > 0 ? similarEvents.map((e) => `- [${e.event_type}] ${e.time.toISOString()}: ${e.summary}`).join("\n") : "Aucun événement similaire trouvé"}

Question de l'utilisateur: "${question}"

Réponds de manière naturelle et concise en français, en te basant sur le contexte fourni. Si tu ne peux pas répondre à partir du contexte, indique-le honnêtement.`;

    let answer = "";
    try {
      const response = await this.callOllama(
        this.config.get<string>("ai.ollamaModel", "moondream"),
        "Tu es un assistant de sécurité physique qui répond aux questions des opérateurs en français. Sois concis et précis.",
        context,
      );
      answer = response;
    } catch (err: any) {
      this.logger.warn(`Ollama assistant query failed: ${err.message}`);
      answer = "Désolé, je n'ai pas pu traiter votre question. Vérifiez la connexion à l'assistant IA.";
    }

    return { answer, sources };
  }

  // ── 4. Embed Event (for pgvector storage) ──

  async embedEvent(eventType: string, eventId: string, summary: string, siteId: string, time: Date): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(summary);

      await this.prisma.$queryRawUnsafe(
        `INSERT INTO event_embeddings (time, site_id, event_type, event_id, summary, embedding)
         VALUES ($1::timestamptz, $2::uuid, $3::varchar, $4::uuid, $5::text, $6::vector)`,
        time,
        siteId,
        eventType,
        eventId,
        summary,
        `[${embedding.join(",")}]`,
      );

      this.logger.debug(`Embedding stored for ${eventType} event ${eventId}`);
    } catch (err: any) {
      this.logger.warn(`Failed to embed event ${eventId}: ${err.message}`);
    }
  }

  // ── 5. Event Bus Listeners ──

  @OnEvent("access.granted", { async: true })
  async onAccessGranted(payload: {
    credentialId: string;
    userId: string;
    doorId: string;
    siteId: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      const door = await this.prisma.door.findUnique({
        where: { id: payload.doorId },
        select: { name: true },
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { firstName: true, lastName: true },
      });

      const summary = `Accès accordé — Porte: ${door?.name || payload.doorId}, Utilisateur: ${user ? `${user.firstName} ${user.lastName}` : "Inconnu"}`;
      await this.aiQueue.add("embed-event", {
        eventType: "access_granted",
        eventId: payload.credentialId,
        summary,
        siteId: payload.siteId,
        time: payload.timestamp,
      });
    } catch (err: any) {
      this.logger.error(`Failed to queue access.granted embedding: ${err.message}`);
    }
  }

  @OnEvent("access.denied", { async: true })
  async onAccessDenied(payload: {
    credentialId: string;
    doorId: string;
    siteId: string;
    timestamp: Date;
    reason?: string;
  }): Promise<void> {
    try {
      const door = await this.prisma.door.findUnique({
        where: { id: payload.doorId },
        select: { name: true },
      });

      const summary = `Accès refusé — Porte: ${door?.name || payload.doorId}, Motif: ${payload.reason || "Non spécifié"}`;
      await this.aiQueue.add("embed-event", {
        eventType: "access_denied",
        eventId: payload.credentialId,
        summary,
        siteId: payload.siteId,
        time: payload.timestamp,
      });
    } catch (err: any) {
      this.logger.error(`Failed to queue access.denied embedding: ${err.message}`);
    }
  }

  @OnEvent("door.state-changed", { async: true })
  async onDoorStateChanged(payload: {
    doorId: string;
    siteId: string;
    previousState: string;
    newState: string;
    timestamp: Date;
  }): Promise<void> {
    // Only embed abnormal states
    const abnormalStates = ["forced", "held-open", "unsecured", "desynchronized"];
    if (!abnormalStates.includes(payload.newState)) return;

    try {
      const door = await this.prisma.door.findUnique({
        where: { id: payload.doorId },
        select: { name: true },
      });

      const summary = `État anormal de porte — Porte: ${door?.name || payload.doorId}, État: ${payload.previousState} → ${payload.newState}`;
      await this.aiQueue.add("embed-event", {
        eventType: "door_abnormal_state",
        eventId: payload.doorId,
        summary,
        siteId: payload.siteId,
        time: payload.timestamp,
      });
    } catch (err: any) {
      this.logger.error(`Failed to queue door.state-changed embedding: ${err.message}`);
    }
  }

  @OnEvent("anpr.recognized", { async: true })
  async onAnprRecognized(payload: {
    plate: string;
    cameraId: string;
    siteId: string;
    decision: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      const camera = await this.prisma.camera.findUnique({
        where: { id: payload.cameraId },
        select: { name: true },
      });

      const summary = `Véhicule reconnu — Plaque: ${payload.plate}, Caméra: ${camera?.name || payload.cameraId}, Décision: ${payload.decision}`;
      await this.aiQueue.add("embed-event", {
        eventType: "anpr_recognized",
        eventId: payload.plate,
        summary,
        siteId: payload.siteId,
        time: payload.timestamp,
      });
    } catch (err: any) {
      this.logger.error(`Failed to queue anpr.recognized embedding: ${err.message}`);
    }
  }

  // ── 6. Check Ollama Status ──

  async checkStatus(): Promise<{ ollamaConnected: boolean; model: string; embeddingModel: string }> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.config.get<string>("ai.ollamaModel", "moondream"),
          prompt: "ping",
          stream: false,
        }),
        signal: AbortSignal.timeout(5000),
      });

      return {
        ollamaConnected: response.ok,
        model: this.config.get<string>("ai.ollamaModel", "moondream"),
        embeddingModel: this.config.get<string>("ai.embeddingModel", "nomic-embed-text"),
      };
    } catch {
      return {
        ollamaConnected: false,
        model: this.config.get<string>("ai.ollamaModel", "moondream"),
        embeddingModel: this.config.get<string>("ai.embeddingModel", "nomic-embed-text"),
      };
    }
  }

  // ── Private Helpers ──

  private async callOllama(model: string, system: string, prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          system,
          stream: false,
          options: { temperature: 0.1 },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}`);
      }

      const data = await response.json();
      return data.response || "";
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("Ollama request timed out after 15s");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.config.get<string>("ai.embeddingModel", "nomic-embed-text"),
          prompt: text,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama embeddings returned ${response.status}`);
      }

      const data = await response.json();
      return data.embedding || [];
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseQueryResponse(response: string): AIQuerySpec {
    // Try to extract JSON from the response (handle surrounding text/code fences)
    let jsonStr = response.trim();
    const jsonMatch = jsonStr.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Remove markdown code fences if present
    jsonStr = jsonStr.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    try {
      const parsed = JSON.parse(jsonStr);

      return {
        event_types: Array.isArray(parsed.event_types) ? parsed.event_types : [],
        filters: {
          site_name: parsed.filters?.site_name || undefined,
          from_time: parsed.filters?.from_time || undefined,
          to_time: parsed.filters?.to_time || undefined,
          door_name: parsed.filters?.door_name || undefined,
          plate: parsed.filters?.plate || undefined,
        },
        query_summary: parsed.query_summary || parsed.query_description || "",
      };
    } catch {
      this.logger.warn(`Failed to parse Ollama response as JSON: ${jsonStr.substring(0, 100)}`);
      return {
        event_types: [],
        filters: {},
        query_summary: "Interprétation échouée",
      };
    }
  }

  private async executeEventQuery(spec: AIQuerySpec, siteId: string | null | undefined): Promise<TimelineEntry[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (siteId) {
      conditions.push(`ae.site_id = $${idx}::uuid`);
      values.push(siteId);
      idx++;
    }

    if (spec.filters.from_time) {
      conditions.push(`ae.time >= $${idx}::timestamptz`);
      values.push(new Date(spec.filters.from_time));
      idx++;
    }

    if (spec.filters.to_time) {
      conditions.push(`ae.time <= $${idx}::timestamptz`);
      values.push(new Date(spec.filters.to_time));
      idx++;
    }

    // Default to last 30 days if no time filters
    if (!spec.filters.from_time && !spec.filters.to_time) {
      conditions.push(`ae.time >= NOW() - INTERVAL '30 days'`);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    // Determine which hypertables to query based on event_types
    const queryAccessEvents = !spec.event_types.length ||
      spec.event_types.some((t) => ["access_granted", "access_denied"].includes(t));

    const queryDoorEvents = !spec.event_types.length ||
      spec.event_types.some((t) => ["door_forced", "door_held_open", "door_unsecured", "tailgating"].includes(t));

    const queryAnprEvents = !spec.event_types.length ||
      spec.event_types.some((t) => ["anpr_allow", "anpr_deny"].includes(t));

    const results: TimelineEntry[] = [];

    // Query access_events
    if (queryAccessEvents) {
      try {
        const accessFilter = spec.event_types.includes("access_granted") && !spec.event_types.includes("access_denied")
          ? "AND decision = 'granted'"
          : spec.event_types.includes("access_denied") && !spec.event_types.includes("access_granted")
            ? "AND decision = 'denied'"
            : "";

        const rows = await this.prisma.$queryRawUnsafe<Array<{
          id: string;
          time: Date;
          site_id: string;
          door_id: string;
          decision: string;
          credential_id: string;
          user_name: string;
          metadata: any;
        }>>(
          `SELECT id::text, time, site_id::text, door_id::text, decision::text,
                  COALESCE(metadata->>'credential_id', '') as credential_id,
                  COALESCE(metadata->>'user_name', '') as user_name,
                  metadata
           FROM access_events ae
           ${whereClause} ${accessFilter}
           ORDER BY ae.time DESC
           LIMIT 50`,
          ...values,
        );

        for (const row of rows) {
          results.push({
            time: row.time.toISOString(),
            event_type: row.decision === "granted" ? "access_granted" : "access_denied",
            site_id: row.site_id,
            door_id: row.door_id,
            credential_id: row.credential_id || undefined,
            user_name: row.user_name || undefined,
            decision: row.decision,
            summary: row.decision === "granted" ? "Accès accordé" : "Accès refusé",
          });
        }
      } catch (err: any) {
        this.logger.warn(`access_events query failed: ${err.message}`);
      }
    }

    // Query door_state_log for abnormal events
    if (queryDoorEvents) {
      try {
        const abnormalStates = ["forced", "held_open"];
        const rows = await this.prisma.$queryRawUnsafe<Array<{
          id: string;
          time: Date;
          site_id: string;
          door_id: string;
          state: string;
        }>>(
          `SELECT id::text, time, site_id::text, door_id::text, state
           FROM door_state_log
           WHERE state IN (${abnormalStates.map((_, i) => `$${idx + i}::text`).join(",")})
           ORDER BY time DESC
           LIMIT 50`,
          ...values,
          ...abnormalStates,
        );

        for (const row of rows) {
          results.push({
            time: row.time.toISOString(),
            event_type: `door_${row.state}`,
            site_id: row.site_id,
            door_id: row.door_id,
            summary: `État de porte anormal: ${row.state}`,
          });
        }
      } catch (err: any) {
        this.logger.warn(`door_state_log query failed: ${err.message}`);
      }
    }

    // Query vehicle_events for ANPR
    if (queryAnprEvents) {
      try {
        let plateFilter = "";
        if (spec.filters.plate) {
          plateFilter = `AND plate ILIKE $${idx}`;
          values.push(`%${spec.filters.plate}%`);
          idx++;
        }

        const rows = await this.prisma.$queryRawUnsafe<Array<{
          time: Date;
          site_id: string;
          camera_id: string;
          plate: string;
          decision: string;
        }>>(
          `SELECT time, site_id::text, COALESCE(camera_id::text, '') as camera_id, plate, decision
           FROM vehicle_events
           WHERE site_id = $1::uuid ${plateFilter}
           ORDER BY time DESC
           LIMIT 50`,
          ...values,
        );

        for (const row of rows) {
          results.push({
            time: row.time.toISOString(),
            event_type: row.decision === "allow" ? "anpr_allow" : "anpr_deny",
            site_id: row.site_id,
            camera_id: row.camera_id || undefined,
            summary: `Véhicule ${row.plate} — ${row.decision}`,
          });
        }
      } catch (err: any) {
        this.logger.warn(`vehicle_events query failed: ${err.message}`);
      }
    }

    // Sort combined results by time descending and limit
    results.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return results.slice(0, 50);
  }
}
