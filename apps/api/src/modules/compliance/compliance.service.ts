import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import Handlebars from "handlebars";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { WebhookService } from "../webhook/webhook.service";
import { EventEmitter2 } from "@nestjs/event-emitter";

// Register Handlebars helpers used by templates
Handlebars.registerHelper("eq", function (a: unknown, b: unknown) {
  return a === b;
});

Handlebars.registerHelper("slice", function (val: string, start: number, end: number) {
  return val ? val.slice(start, end) : "";
});

Handlebars.registerHelper("add", function (val: number, inc: number) {
  return (val || 0) + inc;
});

Handlebars.registerHelper("dateStr", function () {
  return new Date().toISOString().split("T")[0].replace(/-/g, "");
});

export interface GenerateReportParams {
  orgId: string;
  reportType: "soc2" | "iso27001" | "access-review";
  dateRange?: { from: Date; to: Date };
}

export interface ReportResult {
  buffer: Buffer;
  filename: string;
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly webhookService: WebhookService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Generate a compliance report as a downloadable PDF.
   * Supported types: soc2, iso27001, access-review
   */
  async generateReport(params: GenerateReportParams): Promise<ReportResult> {
    const { orgId, reportType, dateRange } = params;

    // Fetch organization info
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      throw new NotFoundException("Organisation non trouvée");
    }

    // Get report data based on type
    const reportData = await this.getReportData(orgId, reportType, dateRange);

    // Read and compile the Handlebars template
    const templatePath = path.join(
      __dirname,
      "templates",
      `${reportType}-report.hbs`,
    );

    let templateSource: string;
    try {
      templateSource = fs.readFileSync(templatePath, "utf-8");
    } catch {
      this.logger.error(`Template not found: ${templatePath}`);
      throw new NotFoundException(
        `Modèle de rapport introuvable: ${reportType}`,
      );
    }

    const template = Handlebars.compile(templateSource);
    const html = template({
      ...reportData,
      generatedAt: new Date().toLocaleString("fr-FR"),
      reportId: `RPT-${reportType.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
    });

    // Generate PDF using PDFKit (matching incident.service.ts pattern)
    const pdfBuffer = await this.generatePdf(
      html,
      reportType,
      org.displayName || org.name,
    );

    const filename = `${reportType}-report-${new Date().toISOString().split("T")[0]}.pdf`;

    return { buffer: pdfBuffer, filename };
  }

  /**
   * Aggregate report data based on report type.
   */
  private async getReportData(
    orgId: string,
    reportType: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<Record<string, unknown>> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    const orgName = org?.displayName || org?.name || "N/A";

    if (reportType === "soc2") {
      return this.getSoc2Data(orgId, orgName, dateRange);
    }
    if (reportType === "iso27001") {
      return this.getIso27001Data(orgId, orgName, dateRange);
    }
    if (reportType === "access-review") {
      return this.getAccessReviewData(orgId, orgName);
    }

    return { orgName };
  }

  /**
   * SOC 2: Audit logs, incident summaries, user access events, security control evidence.
   */
  private async getSoc2Data(
    orgId: string,
    orgName: string,
    dateRange?: { from: Date; to: Date },
  ) {
    const auditLogs = await this.auditService.queryAuditLog({
      organizationId: orgId,
      from: dateRange?.from?.toISOString(),
      to: dateRange?.to?.toISOString(),
    });

    const incidents = await this.prisma.incident.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const memberCount = await this.prisma.organizationMember.count({
      where: { organizationId: orgId, isActive: true },
    });

    const cameraCount = await this.prisma.camera.count({
      where: { organizationId: orgId },
    });

    const doorCount = await this.prisma.door.count({
      where: { organizationId: orgId },
    });

    // Aggregate audit events by action type for control evidence
    const actionCounts: Record<string, number> = {};
    const entries = (auditLogs as any).data || (auditLogs as any) || [];
    for (const entry of entries) {
      const action = entry.action || "unknown";
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    }

    return {
      reportTitle: "Rapport SOC 2 — Contrôles de Sécurité",
      orgName,
      totalAuditEvents: entries.length,
      totalIncidents: incidents.length,
      totalUsers: memberCount,
      totalCameras: cameraCount,
      totalDoors: doorCount,
      auditEntries: entries.slice(0, 50),
      incidents: incidents.slice(0, 20),
      controlSummary: Object.entries(actionCounts).map(
        ([action, count]) => ({
          action,
          count,
        }),
      ),
      dateRangeLabel: dateRange
        ? `${dateRange.from.toISOString().split("T")[0]} — ${dateRange.to.toISOString().split("T")[0]}`
        : "Toute la période",
    };
  }

  /**
   * ISO 27001: ISMS controls status, risk assessment data, incident response metrics.
   */
  private async getIso27001Data(
    orgId: string,
    orgName: string,
    dateRange?: { from: Date; to: Date },
  ) {
    const incidents = await this.prisma.incident.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const auditLogs = await this.auditService.queryAuditLog({
      organizationId: orgId,
      from: dateRange?.from?.toISOString(),
      to: dateRange?.to?.toISOString(),
    });

    const entries = (auditLogs as any).data || (auditLogs as any) || [];

    // Calculate incident response metrics
    const closedIncidents = incidents.filter(
      (i) => i.status === "RESOLVED" || i.status === "CLOSED",
    );
    const avgResolutionTime = closedIncidents.length > 0
      ? closedIncidents.reduce((sum, i) => {
          if (!i.closedAt) return sum;
          return sum + (i.closedAt.getTime() - i.createdAt.getTime());
        }, 0) / closedIncidents.length
      : 0;

    // Risk assessment: incidents by severity
    const bySeverity: Record<string, number> = {};
    for (const inc of incidents) {
      bySeverity[inc.severity] = (bySeverity[inc.severity] || 0) + 1;
    }

    return {
      reportTitle: "Rapport ISO 27001 — Conformité SMIS",
      orgName,
      totalIncidents: incidents.length,
      closedIncidents: closedIncidents.length,
      openIncidents: incidents.filter(
        (i) => i.status !== "RESOLVED" && i.status !== "CLOSED",
      ).length,
      avgResolutionHours: Math.round(
        avgResolutionTime / (1000 * 60 * 60) * 100,
      ) / 100,
      totalAuditEvents: entries.length,
      incidentsBySeverity: Object.entries(bySeverity).map(
        ([severity, count]) => ({ severity, count }),
      ),
      incidents: incidents.slice(0, 30),
      ismsControls: [
        { control: "A.5 — Politiques de sécurité", status: "En place" },
        { control: "A.6 — Organisation de la sécurité", status: "En place" },
        {
          control: "A.8 — Gestion des actifs",
          status: "En place",
        },
        {
          control: "A.9 — Contrôle d'accès",
          status: "En place",
        },
        {
          control: "A.12 — Sécurité des opérations",
          status: "En place",
        },
        {
          control: "A.16 — Gestion des incidents",
          status: "En place",
        },
        {
          control: "A.17 — Continuité d'activité",
          status: "Partiel",
        },
      ],
      dateRangeLabel: dateRange
        ? `${dateRange.from.toISOString().split("T")[0]} — ${dateRange.to.toISOString().split("T")[0]}`
        : "Toute la période",
    };
  }

  /**
   * Access Review: OrganizationMember list with roles, last activity, permissions.
   */
  private async getAccessReviewData(
    orgId: string,
    orgName: string,
  ) {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const memberData = members.map((m) => ({
      id: m.id,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      role: m.role,
      isActive: m.isActive,
      joinedAt: m.joinedAt,
      userCreatedAt: m.user.createdAt,
      userIsActive: m.user.isActive,
    }));

    return {
      reportTitle: "Revue des Accès — Organisation",
      orgName,
      totalMembers: memberData.length,
      members: memberData,
      roleSummary: this.summarizeRoles(memberData),
    };
  }

  private summarizeRoles(
    members: Array<{ role: string }>,
  ): Array<{ role: string; count: number }> {
    const counts: Record<string, number> = {};
    for (const m of members) {
      counts[m.role] = (counts[m.role] || 0) + 1;
    }
    return Object.entries(counts).map(([role, count]) => ({ role, count }));
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // HAPDP Methods (Phase 4, BAS-30 to BAS-35)
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Generate a HAPDP declaration PDF auto-filled with org info and form data.
   * BAS-30: Assisted declaration wizard generates ready-to-submit PDF.
   */
  async generateHapdpDeclaration(
    orgId: string,
    formData: { processingTypes: string[]; address: string; siret: string; representative: string; declarationDate: string; signature: string },
  ): Promise<ReportResult> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException("Organisation non trouvée");
    }

    const templatePath = path.join(__dirname, "templates", "hapdp-declaration.hbs");
    let templateSource: string;
    try {
      templateSource = fs.readFileSync(templatePath, "utf-8");
    } catch {
      throw new NotFoundException("Modèle de déclaration HAPDP introuvable");
    }

    const template = Handlebars.compile(templateSource);
    const html = template({
      org,
      formData,
      generatedAt: new Date().toLocaleString("fr-FR"),
      dateStr: new Date().toISOString().split("T")[0].replace(/-/g, ""),
    });

    const pdfBuffer = await this.generateHapdpPdf(html, org.displayName || org.name);
    const filename = `hapdp-declaration-${orgId.slice(0, 8)}-${new Date().toISOString().split("T")[0]}.pdf`;

    // Log generation to audit
    await this.auditService.log({
      action: "HAPDP_DECLARATION_GENERATED",
      entity: "compliance",
      entityId: orgId,
    });

    // Dispatch webhook
    await this.webhookService.dispatchWebhook("bastion.compliance_event", orgId, {
      type: "hapdp_declaration_generated",
      orgId,
      timestamp: new Date().toISOString(),
    });

    return { buffer: pdfBuffer, filename };
  }

  /**
   * Generate a consent signage PDF for a camera — print-ready A4 format.
   * BAS-32: Camera consent signage module with timestamped proof.
   */
  async generateConsentSignage(
    orgId: string,
    cameraId: string,
    siteName: string,
  ): Promise<ReportResult & { recordId: string }> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException("Organisation non trouvée");
    }

    const camera = await this.prisma.camera.findUnique({ where: { id: cameraId } });
    if (!camera) {
      throw new NotFoundException("Caméra non trouvée");
    }

    const templatePath = path.join(__dirname, "templates", "consent-signage.hbs");
    let templateSource: string;
    try {
      templateSource = fs.readFileSync(templatePath, "utf-8");
    } catch {
      throw new NotFoundException("Modèle de signalétique introuvable");
    }

    const template = Handlebars.compile(templateSource);
    const generatedAt = new Date();
    const html = template({
      cameraName: camera.name,
      siteName,
      orgName: org.displayName || org.name,
      installationDate: camera.createdAt ? new Date(camera.createdAt).toLocaleDateString("fr-FR") : "N/A",
      generatedAt: generatedAt.toLocaleString("fr-FR"),
      cameraRef: cameraId.slice(0, 8),
      dateStr: generatedAt.toISOString().split("T")[0].replace(/-/g, ""),
      contactEmail: org.billingEmail || "dpo@example.com",
      portalUrl: `${process.env.PORTAL_URL || "https://portal.example.com"}/conformite/hapdp/portail`,
    });

    const pdfBuffer = await this.generateHapdpPdf(html, org.displayName || org.name);
    const filename = `consent-signage-${cameraId.slice(0, 8)}-${generatedAt.toISOString().split("T")[0]}.pdf`;

    // Create ConsentSignage record (BAS-32 proof)
    const record = await this.prisma.consentSignage.create({
      data: {
        organizationId: orgId,
        cameraId,
        siteName,
        pdfPath: filename,
        generatedAt,
        generatedById: "", // Will be populated by caller if available
      },
    });

    // Log generation to audit
    await this.auditService.log({
      action: "CONSENT_SIGNAGE_GENERATED",
      entity: "consent_signage",
      entityId: record.id,
    });

    // Dispatch webhook
    await this.webhookService.dispatchWebhook("bastion.compliance_event", orgId, {
      type: "consent_signage_generated",
      cameraId,
      siteName,
      signageId: record.id,
      timestamp: generatedAt.toISOString(),
    });

    return { buffer: pdfBuffer, filename, recordId: record.id };
  }

  /**
   * Export processing register as CSV or PDF.
   * BAS-31: Processing register with CSV/PDF export.
   */
  async generateProcessingRegisterExport(
    orgId: string,
    format: "csv" | "pdf",
  ): Promise<ReportResult> {
    const records = await this.prisma.processingRecord.findMany({
      where: { organizationId: orgId },
      orderBy: { performedAt: "desc" },
      take: 1000,
    });

    const filename = `registre-traitements-${orgId.slice(0, 8)}-${new Date().toISOString().split("T")[0]}`;

    if (format === "csv") {
      const header = "Type d'événement,Entité,Action,Effectué par,Date\n";
      const rows = records.map((r) =>
        [
          `"${r.eventType}"`,
          `"${r.entityType}"`,
          `"${r.action}"`,
          `"${r.performedById || "système"}"`,
          `"${r.performedAt.toISOString()}"`,
        ].join(","),
      );
      const buffer = Buffer.from(header + rows.join("\n"), "utf-8");
      return { buffer, filename: `${filename}.csv` };
    }

    // PDF: generate pdfkit document with table layout
    const buffer = await this.generateProcessingRegisterPdf(records, orgId);
    return { buffer, filename: `${filename}.pdf` };
  }

  /**
   * Log a processing event to the register (auto-populate per BAS-31).
   * Called from EventEmitter listeners and service methods.
   */
  async logProcessingEvent(
    orgId: string,
    eventType: string,
    entityType: string,
    entityId: string,
    action: string,
    performedById?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.processingRecord.create({
      data: {
        organizationId: orgId,
        eventType,
        entityType,
        entityId,
        action,
        performedById,
        metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  /**
   * Register EventEmitter listeners for auto-populating ProcessingRecord.
   * Called at module init to wire up BAS-31 auto-population.
   */
  registerProcessingListeners(): void {
    // Access events
    this.eventEmitter.on("access.granted", (payload: { orgId: string; entityId: string; performedById?: string; metadata?: Record<string, unknown> }) => {
      this.logProcessingEvent(payload.orgId, "ACCESS_GRANTED", "access_event", payload.entityId, "CREATE", payload.performedById, payload.metadata).catch((err) =>
        this.logger.warn(`Failed to log processing event: ${err.message}`),
      );
    });

    this.eventEmitter.on("access.denied", (payload: { orgId: string; entityId: string; performedById?: string; metadata?: Record<string, unknown> }) => {
      this.logProcessingEvent(payload.orgId, "ACCESS_DENIED", "access_event", payload.entityId, "CREATE", payload.performedById, payload.metadata).catch((err) =>
        this.logger.warn(`Failed to log processing event: ${err.message}`),
      );
    });

    // Alert events
    this.eventEmitter.on("alert.created", (payload: { orgId: string; entityId: string; metadata?: Record<string, unknown> }) => {
      this.logProcessingEvent(payload.orgId, "ALERT_CREATED", "alert", payload.entityId, "CREATE", undefined, payload.metadata).catch((err) =>
        this.logger.warn(`Failed to log processing event: ${err.message}`),
      );
    });

    // Face enrollment
    this.eventEmitter.on("face.enrolled", (payload: { orgId: string; entityId: string; performedById?: string }) => {
      this.logProcessingEvent(payload.orgId, "FACE_ENROLLMENT", "face", payload.entityId, "CREATE", payload.performedById).catch((err) =>
        this.logger.warn(`Failed to log processing event: ${err.message}`),
      );
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // HAPDP-specific PDF generators
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Generate a styled A4 PDF for HAPDP declaration and consent signage.
   */
  private generateHapdpPdf(html: string, orgName: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Header
      doc.fontSize(18).font("Helvetica-Bold").text("VaultOS — HAPDP Compliance", { align: "left" });
      doc.moveDown();

      // Render HTML sections as structured PDF content
      const sections = this.extractHapdpSections(html);
      for (const section of sections) {
        if (section.isHeader) {
          doc.fontSize(14).font("Helvetica-Bold").text(section.title);
        } else {
          doc.fontSize(10).font("Helvetica").text(section.content);
        }
        doc.moveDown(0.3);
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).font("Helvetica-Oblique").text(
        `Généré le ${new Date().toLocaleString("fr-FR")} — VaultOS v1.0 — ${orgName}`,
        { align: "center" },
      );
      doc.fontSize(7).font("Helvetica").text(
        "Document généré automatiquement — Conforme à la réglementation HAPDP (Loi n° 2018-37)",
        { align: "center" },
      );

      doc.end();
    });
  }

  /**
   * Generate a processing register PDF with table layout.
   */
  private async generateProcessingRegisterPdf(
    records: Array<{ eventType: string; entityType: string; entityId: string; action: string; performedById: string | null; performedAt: Date; metadata: unknown | null }>,
    _orgId: string,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      doc.fontSize(16).font("Helvetica-Bold").text("Registre des Traitements", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica").text(`Généré le: ${new Date().toLocaleString("fr-FR")}`);
      doc.moveDown();

      // Column headers
      const colWidths = [90, 80, 100, 80, 90];
      const headers = ["Type d'événement", "Entité", "Action", "Effectué par", "Date"];
      const startX = 50;
      let y = doc.y;

      doc.fontSize(9).font("Helvetica-Bold");
      doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), 16).fill("#1a1a2e");
      doc.fillColor("white");
      let x = startX;
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], x + 4, y + 4, { width: colWidths[i], align: "left" });
        x += colWidths[i];
      }
      doc.fillColor("black");
      y += 16;

      // Data rows
      doc.fontSize(8).font("Helvetica");
      for (const record of records) {
        // Check page overflow
        if (y > 720) {
          doc.addPage();
          y = 50;
          // Re-draw header
          doc.fontSize(9).font("Helvetica-Bold");
          doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), 16).fill("#1a1a2e");
          doc.fillColor("white");
          x = startX;
          for (let i = 0; i < headers.length; i++) {
            doc.text(headers[i], x + 4, y + 4, { width: colWidths[i], align: "left" });
            x += colWidths[i];
          }
          doc.fillColor("black");
          y += 16;
          doc.fontSize(8).font("Helvetica");
        }

        // Alternate row background
        if (records.indexOf(record) % 2 === 1) {
          doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), 14).fill("#f8f9fa");
          doc.fillColor("black");
        }

        x = startX;
        const values = [
          record.eventType,
          record.entityType,
          record.action,
          record.performedById || "système",
          record.performedAt.toLocaleString("fr-FR"),
        ];
        for (let i = 0; i < values.length; i++) {
          doc.text(values[i], x + 4, y + 3, { width: colWidths[i], align: "left" });
          x += colWidths[i];
        }
        y += 14;
      }

      doc.fontSize(8).font("Helvetica-Oblique").text(
        `Total des entrées: ${records.length} — VaultOS v1.0`,
        { align: "center" },
      );

      doc.end();
    });
  }

  /**
   * Extract structured sections from HAPDP HTML for PDF rendering.
   */
  private extractHapdpSections(html: string): Array<{ title: string; content: string; isHeader: boolean }> {
    const sections: Array<{ title: string; content: string; isHeader: boolean }> = [];

    // Extract h2 headings and their following content
    const headingRegex = /<h2[^>]*>(.*?)<\/h2>\s*(.*?)(?=(?:<h2|$))/gs;
    let match;
    while ((match = headingRegex.exec(html)) !== null) {
      const title = match[1].replace(/<[^>]*>/g, "").trim();
      const contentBlock = match[2].replace(/<[^>]*>/g, "").trim();
      if (title) {
        sections.push({ title, content: contentBlock, isHeader: true });
      }
    }

    // If no sections matched, extract all text as one blob
    if (sections.length === 0) {
      const text = html.replace(/<[^>]*>/g, "").trim();
      sections.push({ title: "", content: text, isHeader: false });
    }

    return sections;
  }

  /**
   * Generate a PDF from rendered HTML data using PDFKit.
   * Matches the exact pattern from incident.service.ts (new PDFDocument, buffer aggregation, doc.end()).
   */
  private generatePdf(
    html: string,
    reportType: string,
    orgName: string,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Header
      doc.fontSize(18).font("Helvetica-Bold").text(html, {
        align: "left",
      });
      doc.moveDown();

      // Report title with type label
      const typeLabels: Record<string, string> = {
        soc2: "Rapport SOC 2 — Contrôles de Sécurité",
        iso27001: "Rapport ISO 27001 — Conformité SMIS",
        "access-review": "Revue des Accès — Organisation",
      };
      doc.fontSize(20).font("Helvetica-Bold").text(
        typeLabels[reportType] || "Rapport de Conformité",
        { align: "center" },
      );
      doc.moveDown(0.5);

      doc.fontSize(12).font("Helvetica");
      doc.text(`Organisation: ${orgName}`);
      doc.text(`Généré le: ${new Date().toLocaleString("fr-FR")}`);
      doc.moveDown();

      // Separator
      doc.fontSize(10).font("Helvetica");
      doc.text("=".repeat(80), { align: "center" });
      doc.moveDown();

      // Summary section
      doc.fontSize(14).font("Helvetica-Bold").text("Résumé Exécutif");
      doc.moveDown(0.3);

      // Parse the HTML to extract meaningful data sections
      // For simplicity, we render key metrics as structured PDF content
      // then append any additional details as plain text
      const sections = this.extractHtmlSections(html);
      for (const section of sections) {
        doc.fontSize(12).font("Helvetica-Bold").text(section.title);
        doc.moveDown(0.2);
        doc.fontSize(10).font("Helvetica").text(section.content);
        doc.moveDown(0.5);
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).font("Helvetica-Oblique").text(
        `Généré le ${new Date().toLocaleString("fr-FR")} — OVERSIGHT HUB — ${orgName}`,
        { align: "center" },
      );
      doc.fontSize(7).font("Helvetica").text(
        "CONFIDENTIEL — Ce rapport contient des informations sensibles sur la sécurité.",
        { align: "center" },
      );

      doc.end();
    });
  }

  /**
   * Simple helper to extract structured sections from the rendered HTML.
   * Converts HTML heading/text blocks to PDF-friendly sections.
   */
  private extractHtmlSections(
    html: string,
  ): Array<{ title: string; content: string }> {
    const sections: Array<{ title: string; content: string }> = [];

    // Extract <h2> and <h3> sections with following content
    const headingRegex = /<h[23][^>]*>(.*?)<\/h[23]>\s*<p[^>]*>(.*?)<\/p>/gs;
    let match;
    while ((match = headingRegex.exec(html)) !== null) {
      const title = match[1].replace(/<[^>]*>/g, "").trim();
      const content = match[2].replace(/<[^>]*>/g, "").trim();
      if (title) {
        sections.push({ title, content });
      }
    }

    // If no sections extracted, create a default one
    if (sections.length === 0) {
      // Try extracting from <li> items
      const liRegex = /<li[^>]*>(.*?)<\/li>/gs;
      const items: string[] = [];
      while ((match = liRegex.exec(html)) !== null) {
        items.push(match[1].replace(/<[^>]*>/g, "").trim());
      }
      if (items.length > 0) {
        sections.push({
          title: "Détails du Rapport",
          content: items.join("\n"),
        });
      }
    }

    return sections;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Integration Guide PDF (BAS-41 / D-10)
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Generate the API integration guide PDF.
   * Renders the integration-guide.hbs template into a PDF document.
   */
  async generateIntegrationGuide(orgId: string): Promise<ReportResult> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    const orgName = org?.displayName || org?.name || "VaultOS";

    // Read and compile the template
    const templatePath = path.join(__dirname, "templates", "integration-guide.hbs");
    let templateSource: string;
    try {
      templateSource = fs.readFileSync(templatePath, "utf-8");
    } catch (err: any) {
      this.logger.error(`Integration guide template not found: ${templatePath} — ${err.message}`);
      templateSource = `<h1>Guide d'Intégration API</h1><p>Généré le: {{generatedAt}}</p>`;
    }

    const template = Handlebars.compile(templateSource);
    const generatedAt = new Date().toLocaleString("fr-FR");
    const html = template({
      orgName,
      generatedAt,
    });

    // Convert HTML to PDF via pdfkit (same pattern as other reports)
    const pdfBuffer = await this.generateHapdpPdf(html, orgName);
    const filename = `integration-guide-${orgId.slice(0, 8)}-${new Date().toISOString().split("T")[0]}.pdf`;

    this.logger.log(`Integration guide generated for org ${orgId}: ${filename}`);

    return { buffer: pdfBuffer, filename };
  }
}
