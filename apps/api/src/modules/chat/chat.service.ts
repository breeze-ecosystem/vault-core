import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ChatMessageDto } from './chat.dto';

interface CameraInfo {
  id: string;
  name: string;
  status: string;
  siteName: string;
  rtspUrl: string;
  lastSnapshotUrl: string | null;
}

export interface ChatResponse {
  answer: string;
  camerasQueried: string[];
  snapshotIncluded: boolean;
  timestamp: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly ollamaUrl: string;
  private readonly ollamaModel: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.ollamaUrl = this.config.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434');
    this.ollamaModel = this.config.get<string>('OLLAMA_MODEL', 'moondream');
  }

  async handleMessage(userId: string, dto: ChatMessageDto): Promise<ChatResponse> {
    this.logger.log(`Chat from ${userId}: "${dto.message}"`);

    // 1. Identify which cameras are relevant
    const cameras = await this.resolveCameras(dto.message, dto.cameraId);
    this.logger.debug(`Resolved cameras: ${cameras.map(c => c.name).join(', ') || 'none'}`);

    // 2. If no cameras found, answer generally
    if (cameras.length === 0) {
      const answer = await this.generalAnswer(dto.message, dto.history || []);
      return {
        answer,
        camerasQueried: [],
        snapshotIncluded: false,
        timestamp: new Date().toISOString(),
      };
    }

    // 3. Capture snapshots from online cameras
    const snapshots: { cameraName: string; siteName: string; imageB64: string }[] = [];
    for (const cam of cameras) {
      const snapshot = await this.captureSnapshot(cam);
      if (snapshot) {
        snapshots.push({
          cameraName: cam.name,
          siteName: cam.organizationName,
          imageB64: snapshot,
        });
      }
    }

    // 4. If we got snapshots, analyze with VLM
    if (snapshots.length > 0) {
      const answer = await this.analyzeSnapshots(dto.message, snapshots, dto.history || []);
      return {
        answer,
        camerasQueried: cameras.map(c => c.name),
        snapshotIncluded: true,
        timestamp: new Date().toISOString(),
      };
    }

    // 5. Cameras found but no snapshots available
    const cameraList = cameras.map(c => `${c.name} (${c.siteName}) - ${c.status}`).join('\n');
    return {
      answer: `J'ai trouvé les caméras suivantes mais aucune n'a de snapshot disponible pour le moment :\n\n${cameraList}\n\nVérifiez que les caméras sont connectées et que le flux est actif.`,
      camerasQueried: cameras.map(c => c.name),
      snapshotIncluded: false,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Resolve which cameras to query based on the user message
   */
  private async resolveCameras(message: string, explicitCameraId?: string): Promise<CameraInfo[]> {
    // If explicit camera ID provided
    if (explicitCameraId) {
      const cam = await this.prisma.camera.findUnique({
        where: { id: explicitCameraId },
        include: { organization: true },
      });
      if (cam) {
        return [{
          id: cam.id,
          name: cam.name,
          status: cam.status,
          siteName: cam.organization?.name || 'Inconnu',
          rtspUrl: cam.rtspUrl,
          lastSnapshotUrl: cam.lastSnapshotUrl,
        }];
      }
      return [];
    }

    // Smart camera resolution from message
    const allCameras = await this.prisma.camera.findMany({
      include: { organization: true },
    });

    const msgLower = message.toLowerCase();
    const matched: CameraInfo[] = [];

    for (const cam of allCameras) {
      const camName = cam.name.toLowerCase();
      const siteName = (cam.organization?.name || '').toLowerCase();

      // Check if message mentions camera name or site name
      // Extract keywords from camera name (e.g., "couloir", "entree", "parking")
      const keywords = camName.split(/[\s-_]+/).filter(w => w.length > 2);
      const siteKeywords = siteName.split(/[\s-_]+/).filter(w => w.length > 2);

      const matchesCam = keywords.some(kw => msgLower.includes(kw));
      const matchesSite = siteKeywords.some(kw => msgLower.includes(kw));

      if (matchesCam || matchesSite) {
        matched.push({
          id: cam.id,
          name: cam.name,
          status: cam.status,
          siteName: cam.organization?.name || 'Inconnu',
          rtspUrl: cam.rtspUrl,
          lastSnapshotUrl: cam.lastSnapshotUrl,
        });
      }
    }

    // If no specific match, use all ONLINE cameras (limit 3)
    if (matched.length === 0) {
      const online = allCameras
        .filter(c => c.status === 'ONLINE')
        .slice(0, 3)
        .map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          siteName: c.organization?.name || 'Inconnu',
          rtspUrl: c.rtspUrl,
          lastSnapshotUrl: c.lastSnapshotUrl,
        }));
      return online;
    }

    return matched;
  }

  /**
   * Capture a snapshot from a camera using the ingestion service
   */
  private async captureSnapshot(camera: CameraInfo): Promise<string | null> {
    try {
      // Try to fetch from ingestion snapshot endpoint
      const apiPort = this.config.get<number>('PORT', 4000);
      const resp = await fetch(`http://localhost:${apiPort}/api/ingestion/${camera.id}/snapshot`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (resp.ok) {
        const data = await resp.json() as any;
        if (data.snapshot) return data.snapshot;
      }
    } catch {
      // ingestion endpoint not available
    }

    // Fallback: try RTSP snapshot via ffmpeg
    if (camera.rtspUrl) {
      try {
        const { spawn } = await import('child_process');
        const buffer = await new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = [];
          const proc = spawn('ffmpeg', [
            '-rtsp_transport', 'tcp',
            '-i', camera.rtspUrl,
            '-frames:v', '1',
            '-f', 'image2',
            '-q:v', '2',
            '-',
          ], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 });
          proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
          proc.on('error', reject);
          proc.on('close', (code) => {
            if (code === 0) resolve(Buffer.concat(chunks));
            else reject(new Error(`ffmpeg exited with code ${code}`));
          });
        });
        return buffer.toString('base64');
      } catch {
        this.logger.warn(`Failed to capture RTSP snapshot from ${camera.name}`);
      }
    }

    return null;
  }

  /**
   * Analyze snapshots with VLM
   */
  private async analyzeSnapshots(
    question: string,
    snapshots: { cameraName: string; siteName: string; imageB64: string }[],
    history: string[],
  ): Promise<string> {
    // Build context from history
    const contextStr = history.length > 0
      ? `\nContexte précédent:\n${history.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n`
      : '';

    // For each snapshot, ask the VLM
    const results: string[] = [];

    for (const snap of snapshots) {
      const prompt = `Tu es un agent de surveillance IA. Analyse cette image de la caméra "${snap.cameraName}" (org: ${snap.siteName}).
${contextStr}
Question de l'utilisateur: ${question}

Réponds en français de manière claire et concise. Décris ce que tu vois et réponds à la question.`;

      try {
        const response = await fetch(`${this.ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.ollamaModel,
            prompt,
            images: [snap.imageB64],
            stream: false,
            options: { temperature: 0.1 },
          }),
          signal: AbortSignal.timeout(120000),
        });

        if (response.ok) {
          const data = await response.json() as any;
          const answer = (data.response || '').trim();
          if (answer) {
            results.push(`📷 **${snap.cameraName}** (${snap.siteName}):\n${answer}`);
          }
        } else {
          results.push(`📷 **${snap.cameraName}**: Erreur d'analyse - impossible de traiter l'image.`);
        }
      } catch (err) {
        this.logger.error(`VLM error for ${snap.cameraName}: ${err}`);
        results.push(`📷 **${snap.cameraName}**: Analyse en cours... le modèle met trop de temps à répondre.`);
      }
    }

    return results.join('\n\n---\n\n');
  }

  /**
   * General answer without camera (using text-only model)
   */
  private async generalAnswer(question: string, history: string[]): Promise<string> {
    const contextStr = history.length > 0
      ? `\nContexte précédent:\n${history.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n`
      : '';

    const prompt = `Tu es OVERSIGHT AI, un assistant de surveillance intelligent. Tu aides les opérateurs à comprendre ce qui se passe sur leurs sites.
${contextStr}
Question: ${question}

Réponds en français. Si la question concerne une zone spécifique, suggère à l'utilisateur de préciser la caméra ou le site.`;

    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt,
          stream: false,
          options: { temperature: 0.3 },
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (response.ok) {
        const data = await response.json() as any;
        return (data.response || 'Je ne peux pas répondre pour le moment.').trim();
      }
    } catch (err) {
      this.logger.error(`General answer error: ${err}`);
    }

    return 'Le service IA est temporairement indisponible. Veuillez réessayer dans quelques instants.';
  }

  /**
   * Get cameras available for chat
   */
  async getCamerasForChat(userId: string) {
    const cameras = await this.prisma.camera.findMany({
      include: { organization: true },
      orderBy: { name: 'asc' },
    });

    return cameras.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      siteName: c.organization?.name || 'Inconnu',
      orgId: c.orgId,
    }));
  }

  /**
   * Get chat history (placeholder - could use a ChatSession table)
   */
  async getHistory(userId: string) {
    // For now, return empty. Could be extended with a ChatSession model.
    return { messages: [] };
  }
}
