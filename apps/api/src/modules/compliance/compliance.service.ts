import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import Handlebars from "handlebars";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

// Register Handlebars helpers used by templates
Handlebars.registerHelper("eq", function (a: unknown, b: unknown) {
  return a === b;
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
}
