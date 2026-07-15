import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── Environment-driven configuration ──────────────────────────────
const SEED_MODE      = process.env.SEED_MODE || "production"; // "sample" | "production"
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || "admin@oversight.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (SEED_MODE === "sample" ? "admin123" : "");
const ADMIN_FIRST    = process.env.ADMIN_FIRST_NAME || "Admin";
const ADMIN_LAST     = process.env.ADMIN_LAST_NAME  || "OVERSIGHT";
const COMPANY_NAME   = process.env.COMPANY_NAME || "OVERSIGHT";

// ── Production seed: admin user + single default organization ─────
async function seedProduction() {
  if (!ADMIN_PASSWORD) {
    throw new Error(
      "ADMIN_PASSWORD env var is required in production SEED_MODE. " +
      "Refusing to create an admin with an empty password."
    );
  }

  const adminPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      password: adminPassword,         // always update password on seed re-run
    },
    create: {
      email: ADMIN_EMAIL,
      password: adminPassword,
      firstName: ADMIN_FIRST,
      lastName: ADMIN_LAST,
      isActive: true,
    },
  });

  // Single default organization named after the company
  const defaultOrg = await prisma.organization.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: `${COMPANY_NAME} – Default Organization`,
      city: "Unknown",
      country: "XX",
      planTier: "FREE",
    },
  });

  // Create OrganizationMember for admin
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: admin.id, organizationId: defaultOrg.id } },
    update: {},
    create: {
      userId: admin.id,
      organizationId: defaultOrg.id,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log("✅ Production seed completed:");
  console.log(`   Admin user        : ${admin.email}`);
  console.log(`   Default org        : ${defaultOrg.name}`);
  console.log(`   OrganizationMember : admin → ${defaultOrg.name} (role: ADMIN)`);
}

// ── Sample / dev seed: full test dataset ──────────────────────────
async function seedSample() {
  const pw = ADMIN_PASSWORD || "admin123";

  // ── Users (no global role — role lives in OrganizationMember) ──
  const adminPassword = await bcrypt.hash(pw, 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@oversight.local" },
    update: {},
    create: {
      email: "admin@oversight.local",
      password: adminPassword,
      firstName: "Admin",
      lastName: "OVERSIGHT",
      isActive: true,
    },
  });

  const supervisorPassword = await bcrypt.hash("super123", 10);
  const supervisor = await prisma.user.upsert({
    where: { email: "supervisor@oversight.local" },
    update: {},
    create: {
      email: "supervisor@oversight.local",
      password: supervisorPassword,
      firstName: "Cheikh",
      lastName: "Diop",
      isActive: true,
    },
  });

  const viewerPassword = await bcrypt.hash("viewer123", 10);
  const viewer = await prisma.user.upsert({
    where: { email: "viewer@oversight.local" },
    update: {},
    create: {
      email: "viewer@oversight.local",
      password: viewerPassword,
      firstName: "Amadou",
      lastName: "Ba",
      isActive: true,
    },
  });

  // ── Organizations ──
  const dakar = await prisma.organization.upsert({
    where: { id: "org-dakar" },
    update: {},
    create: {
      id: "org-dakar",
      name: "Organisation Dakar Plateau",
      address: "Avenue L.S. Senghor",
      city: "Dakar",
      country: "SN",
      latitude: 14.6937,
      longitude: -17.4441,
      planTier: "FREE",
    },
  });

  const paris = await prisma.organization.upsert({
    where: { id: "org-paris" },
    update: {},
    create: {
      id: "org-paris",
      name: "Organisation Paris CDG",
      address: "Rue de la Paix",
      city: "Paris",
      country: "FR",
      latitude: 48.8566,
      longitude: 2.3522,
      planTier: "PROFESSIONAL",
    },
  });

  const lyon = await prisma.organization.upsert({
    where: { id: "org-lyon" },
    update: {},
    create: {
      id: "org-lyon",
      name: "Organisation Lyon Part-Dieu",
      address: "Bd Vivier Merle",
      city: "Lyon",
      country: "FR",
      latitude: 45.7609,
      longitude: 4.8596,
      planTier: "FREE",
    },
  });

  // ── OrganizationMembers ──
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: admin.id, organizationId: dakar.id } },
    update: {},
    create: { userId: admin.id, organizationId: dakar.id, role: Role.ADMIN, isActive: true },
  });
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: admin.id, organizationId: paris.id } },
    update: {},
    create: { userId: admin.id, organizationId: paris.id, role: Role.SUPERVISOR, isActive: true },
  });
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: supervisor.id, organizationId: dakar.id } },
    update: {},
    create: { userId: supervisor.id, organizationId: dakar.id, role: Role.SUPERVISOR, isActive: true },
  });
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: supervisor.id, organizationId: paris.id } },
    update: {},
    create: { userId: supervisor.id, organizationId: paris.id, role: Role.OPERATOR, isActive: true },
  });
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: viewer.id, organizationId: dakar.id } },
    update: {},
    create: { userId: viewer.id, organizationId: dakar.id, role: Role.VIEWER, isActive: true },
  });

  // ── Cameras (idempotent with upsert) ──
  const cameraSeeds = [
    { id: "cam-dkr-001", name: "CAM-DKR-001 Entree Principale", rtspUrl: "rtsp://stream:554/dakar-entree",  organizationId: dakar.id, status: "ONLINE" as const,      resolution: "1920x1080", fps: 25, captureInterval: 5 },
    { id: "cam-dkr-002", name: "CAM-DKR-002 Parking",           rtspUrl: "rtsp://stream:554/dakar-parking", organizationId: dakar.id, status: "ONLINE" as const,      resolution: "1920x1080", fps: 25, captureInterval: 5 },
    { id: "cam-par-001", name: "CAM-PAR-001 Hall Accueil",      rtspUrl: "rtsp://stream:554/paris-hall",    organizationId: paris.id, status: "ONLINE" as const,      resolution: "2560x1440", fps: 30, captureInterval: 10 },
    { id: "cam-par-002", name: "CAM-PAR-002 Entrepot",          rtspUrl: "rtsp://stream:554/paris-entrepot",organizationId: paris.id, status: "OFFLINE" as const,     resolution: "1920x1080", fps: 25, captureInterval: 5 },
    { id: "cam-lyn-001", name: "CAM-LYN-001 Couloir A",         rtspUrl: "rtsp://stream:554/lyon-couloir",  organizationId: lyon.id,  status: "MAINTENANCE" as const, resolution: "1280x720",  fps: 15, captureInterval: 5 },
    { id: "cam-lyn-002", name: "CAM-LYN-002 Sortie Secours",    rtspUrl: "rtsp://stream:554/lyon-sortie",   organizationId: lyon.id,  status: "DEGRADED" as const,    resolution: "1920x1080", fps: 10, captureInterval: 5 },
  ];

  const cameras: Awaited<ReturnType<typeof prisma.camera.upsert>>[] = [];
  for (const c of cameraSeeds) {
    const cam = await prisma.camera.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, isRecording: false },
    });
    cameras.push(cam);
  }

  // ── Camera prompts ──
  const promptData = [
    { cameraId: "cam-dkr-001", text: "Y a-t-il une personne qui entre dans la zone sans badge visible ?",        severity: "HIGH" as const },
    { cameraId: "cam-dkr-001", text: "Detecter si quelqu'un porte un casque de securite",                         severity: "MEDIUM" as const },
    { cameraId: "cam-dkr-002", text: "Y a-t-il un vehicule stationne de maniere suspecte ?",                     severity: "HIGH" as const },
    { cameraId: "cam-dkr-002", text: "Detecter un colis ou objet abandonne",                                     severity: "CRITICAL" as const },
    { cameraId: "cam-par-001", text: "Detecter une intrusion en dehors des heures d'ouverture",                  severity: "CRITICAL" as const },
    { cameraId: "cam-par-001", text: "Y a-t-il plus de 10 personnes dans le hall ?",                             severity: "MEDIUM" as const },
    { cameraId: "cam-lyn-001", text: "Detecter un mouvement dans le couloir apres 22h",                          severity: "HIGH" as const },
    { cameraId: "cam-lyn-002", text: "La sortie de secours est-elle bloquee ?",                                  severity: "CRITICAL" as const },
  ];

  // Use deleteMany + create to avoid duplicates on re-run (no natural key)
  await prisma.cameraPrompt.deleteMany({});
  for (const p of promptData) {
    await prisma.cameraPrompt.create({
      data: { cameraId: p.cameraId, text: p.text, severity: p.severity, isActive: true },
    });
  }

  // ── Alerts ──
  const alertTitles = [
    { title: "Intrusion detectee - Zone restreinte",   severity: "CRITICAL" as const, camera: 0 },
    { title: "Mouvement inhabituel - Parking",          severity: "HIGH" as const,     camera: 1 },
    { title: "Qualite video degradee",                  severity: "MEDIUM" as const,   camera: 5 },
    { title: "Camera hors ligne - Entrepot",            severity: "HIGH" as const,     camera: 3 },
    { title: "Objet abandonne detecte",                 severity: "MEDIUM" as const,   camera: 2 },
    { title: "Maintenance planifiee",                   severity: "INFO" as const,     camera: 4 },
    { title: "Personne non identifiee",                 severity: "LOW" as const,      camera: 0 },
    { title: "Flux video intermittent",                 severity: "MEDIUM" as const,   camera: 5 },
    { title: "Acces non autorise tente",                severity: "CRITICAL" as const, camera: 2 },
    { title: "Notification systeme",                    severity: "INFO" as const,     camera: 1 },
  ];

  // Clear old sample alerts before re-creating
  await prisma.alert.deleteMany({});
  for (let i = 0; i < alertTitles.length; i++) {
    const alert = alertTitles[i];
    await prisma.alert.create({
      data: {
        title: alert.title,
        description: "Alerte generee automatiquement par le systeme AI",
        severity: alert.severity,
        status: i < 3 ? "OPEN" : i < 6 ? "ACKNOWLEDGED" : i < 8 ? "RESOLVED" : "FALSE_POSITIVE",
        cameraId: cameras[alert.camera].id,
        ...(i >= 3 ? { acknowledgedBy: supervisor.id, acknowledgedAt: new Date(Date.now() - (10 - i) * 60 * 60 * 1000) } : {}),
        ...(i >= 6 && i < 8 ? { resolvedBy: admin.id, resolvedAt: new Date(Date.now() - (8 - i) * 60 * 60 * 1000) } : {}),
      },
    });
  }

  console.log("✅ Sample seed completed:");
  console.log(`   Users               : 3`);
  console.log(`   Organizations       : 3`);
  console.log(`   OrganizationMembers : 5`);
  console.log(`   Cameras             : ${cameras.length}`);
  console.log(`   Camera Prompts      : ${promptData.length}`);
  console.log(`   Alerts              : ${alertTitles.length}`);
}

// ── Main dispatcher ───────────────────────────────────────────────
async function main() {
  console.log(`Seeding database (mode=${SEED_MODE})...`);

  if (SEED_MODE === "sample") {
    await seedSample();
  } else {
    await seedProduction();
  }
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
