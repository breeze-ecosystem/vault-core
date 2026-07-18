import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { WebhookService } from '../webhook/webhook.service';
import { BastionAnalyticsService } from '../analytics/bastion-analytics.service';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import Handlebars from 'handlebars';

export interface GenerateReportResult {
  buffer: Buffer;
  filename: string;
}

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly webhookService: WebhookService,
    private readonly bastionAnalytics: BastionAnalyticsService,
  ) {
    Handlebars.registerHelper('eq', function (a: unknown, b: unknown) {
      return a === b;
    });
  }

  /**
   * Generate a weekly report PDF with executive summary + appendix.
   */
  async generateWeeklyReport(orgId: string): Promise<GenerateReportResult> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organisation non trouvée');

    const orgName = org.displayName || org.name || 'N/A';
    const kpis = await this.bastionAnalytics.getBastionKpis(orgId);

    // Fetch incidents for the past 7 days
    const incidents = await this.prisma.incident.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Fetch entry trends for the past 7 days
    const entryRows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
      `SELECT DATE(time) AS day, COUNT(*) AS count
       FROM access_events
       WHERE organization_id = $1::uuid AND event_type = 'GRANTED'
         AND time >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(time)
       ORDER BY day ASC`,
      orgId,
    );

    const now = new Date();
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodLabel = `${periodStart.toLocaleDateString('fr-FR')} — ${now.toLocaleDateString('fr-FR')}`;

    const reportData = {
      orgName,
      periodLabel,
      generatedAt: now.toLocaleString('fr-FR'),
      kpis,
      incidents: incidents.map((i) => ({
        id: i.id.slice(0, 8),
        type: i.sourceType || 'incident',
        severity: i.severity,
        createdAt: i.createdAt.toLocaleDateString('fr-FR'),
        cameraName: i.assignedToId || 'N/A',
      })),
      entries: {
        total: entryRows.reduce((sum: number, r: any) => sum + Number(r.count), 0),
        byDay: entryRows.map((r: any) => ({
          day: new Date(r.day).toLocaleDateString('fr-FR'),
          count: Number(r.count),
        })),
      },
    };

    const pdfBuffer = await this.renderPdfFromTemplate('weekly-report', reportData, orgName);

    const filename = `weekly-report-${orgId.slice(0, 8)}-${now.toISOString().split('T')[0]}.pdf`;
    return { buffer: pdfBuffer, filename };
  }

  /**
   * Generate a monthly report PDF with executive summary + trends + appendix.
   */
  async generateMonthlyReport(orgId: string): Promise<GenerateReportResult> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organisation non trouvée');

    const orgName = org.displayName || org.name || 'N/A';
    const kpis = await this.bastionAnalytics.getBastionKpis(orgId);

    // Fetch incidents for the past 30 days
    const incidents = await this.prisma.incident.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Fetch entry trends for the past 30 days
    const entryRows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
      `SELECT DATE(time) AS day, COUNT(*) AS count
       FROM access_events
       WHERE organization_id = $1::uuid AND event_type = 'GRANTED'
         AND time >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(time)
       ORDER BY day ASC`,
      orgId,
    );

    const now = new Date();
    const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const periodLabel = `${periodStart.toLocaleDateString('fr-FR')} — ${now.toLocaleDateString('fr-FR')}`;

    const reportData = {
      orgName,
      periodLabel,
      generatedAt: now.toLocaleString('fr-FR'),
      kpis,
      incidents: incidents.map((i) => ({
        id: i.id.slice(0, 8),
        type: i.sourceType || 'incident',
        severity: i.severity,
        createdAt: i.createdAt.toLocaleDateString('fr-FR'),
        cameraName: i.assignedToId || 'N/A',
      })),
      entries: {
        total: entryRows.reduce((sum: number, r: any) => sum + Number(r.count), 0),
        byDay: entryRows.map((r: any) => ({
          day: new Date(r.day).toLocaleDateString('fr-FR'),
          count: Number(r.count),
        })),
      },
    };

    const pdfBuffer = await this.renderPdfFromTemplate('monthly-report', reportData, orgName);

    const filename = `monthly-report-${orgId.slice(0, 8)}-${now.toISOString().split('T')[0]}.pdf`;
    return { buffer: pdfBuffer, filename };
  }

  /**
   * Render an HTML Handlebars template and convert to PDF via PDFKit buffer aggregation.
   */
  private async renderPdfFromTemplate(
    templateName: string,
    data: Record<string, unknown>,
    orgName: string,
  ): Promise<Buffer> {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
    let templateSource: string;
    try {
      templateSource = fs.readFileSync(templatePath, 'utf-8');
    } catch (err: any) {
      this.logger.error(`Template not found: ${templatePath} — ${err.message}`);
      // Fall back to inline minimal template
      templateSource = `<h1>Rapport — {{orgName}}</h1><p>Généré le: {{generatedAt}}</p>`;
    }

    const template = Handlebars.compile(templateSource);
    const html = template(data);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(12).font('Helvetica');
      doc.text('Rapport Hebdomadaire — ' + orgName, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(8).font('Helvetica-Oblique').text('CONFIDENTIEL — Usage interne', { align: 'center' });
      doc.moveDown();

      // Render KPI cards section (executive summary — front of report per D-01)
      doc.fontSize(14).font('Helvetica-Bold').text('Résumé Exécutif', { align: 'left' });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');

      const kpis = (data as any).kpis || {};
      doc.text(`Incidents aujourd'hui: ${kpis.incidentsToday || 0}`);
      doc.text(`Alertes actives: ${kpis.activeAlerts || 0}`);
      doc.text(`Caméras en ligne: ${kpis.camerasOnline || 0}`);
      doc.text(`Stockage utilisé: ${kpis.storageUsedBytes || 0} bytes`);
      doc.text(`Entrées aujourd'hui: ${kpis.entriesToday || 0}`);
      doc.moveDown();

      // Timeline / incident count
      const incidents = (data as any).incidents || [];
      doc.fontSize(12).font('Helvetica-Bold').text('Incidents');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').text(`Total des incidents: ${incidents.length}`);
      doc.moveDown();

      // Separator — appendix marker
      doc.moveDown();
      doc.fontSize(10).font('Helvetica').text('—'.repeat(60), { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).font('Helvetica-Bold').text('Annexe — Détails des Événements');
      doc.moveDown(0.3);

      // Render incident table in appendix
      doc.fontSize(9).font('Helvetica');
      for (const inc of incidents.slice(0, 50)) {
        doc.text(`[${inc.severity}] ${inc.id} — ${inc.type} — ${inc.createdAt} — ${inc.cameraName}`);
        doc.moveDown(0.1);
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica-Oblique').text(
        `Généré le ${new Date().toLocaleString('fr-FR')} — VaultOS v1.0 — Rapport généré automatiquement`,
        { align: 'center' },
      );
      doc.fontSize(7).font('Helvetica').text('CONFIDENTIEL — Usage interne', { align: 'center' });

      doc.end();
    });
  }

  /**
   * Store a generated report to the filesystem.
   */
  async storeReport(orgId: string, type: string, pdfBuffer: Buffer, reportId: string): Promise<string> {
    const reportsDir = this.config.get<string>('REPORTS_DIR', '/tmp/reports');
    const orgDir = path.join(reportsDir, orgId);
    fs.mkdirSync(orgDir, { recursive: true });

    const filePath = path.join(orgDir, `${type}-${reportId}.pdf`);
    fs.writeFileSync(filePath, pdfBuffer);

    this.logger.log(`Report stored: ${filePath} (${pdfBuffer.length} bytes)`);
    return filePath;
  }

  /**
   * List generated reports with metadata.
   */
  async getReportsList(orgId: string, pagination: { page: number; limit: number }) {
    const reportsDir = this.config.get<string>('REPORTS_DIR', '/tmp/reports');
    const orgDir = path.join(reportsDir, orgId);

    let files: string[] = [];
    try {
      files = fs.readdirSync(orgDir).filter((f) => f.endsWith('.pdf'));
    } catch {
      // Directory doesn't exist yet
      return { data: [], total: 0, page: pagination.page, limit: pagination.limit };
    }

    // Sort by modification time (newest first)
    const fileStats = files
      .map((f) => ({
        filename: f,
        path: path.join(orgDir, f),
        stat: fs.statSync(path.join(orgDir, f)),
      }))
      .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

    const total = fileStats.length;
    const offset = (pagination.page - 1) * pagination.limit;
    const page = fileStats.slice(offset, offset + pagination.limit);

    const data = page.map((f) => {
      const match = f.filename.match(/^(weekly|monthly)-report-/);
      const type = match ? match[1] : 'unknown';
      return {
        id: f.filename.replace('.pdf', ''),
        type,
        filename: f.filename,
        sizeBytes: f.stat.size,
        createdAt: f.stat.mtime.toISOString(),
      };
    });

    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  /**
   * Get report PDF content by ID.
   */
  async getReportContent(orgId: string, reportId: string): Promise<Buffer> {
    const reportsDir = this.config.get<string>('REPORTS_DIR', '/tmp/reports');
    const filePath = path.join(reportsDir, orgId, `${reportId}.pdf`);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Rapport non trouvé');
    }

    return fs.readFileSync(filePath);
  }
}
