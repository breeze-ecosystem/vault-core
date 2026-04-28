import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@oversight.local" },
    update: {},
    create: {
      email: "admin@oversight.local",
      password: adminPassword,
      firstName: "Admin",
      lastName: "OVERSIGHT",
      role: Role.ADMIN,
      isActive: true,
    },
  });

  // Create supervisor
  const supervisorPassword = await bcrypt.hash("super123", 10);
  const supervisor = await prisma.user.upsert({
    where: { email: "supervisor@oversight.local" },
    update: {},
    create: {
      email: "supervisor@oversight.local",
      password: supervisorPassword,
      firstName: "Cheikh",
      lastName: "Diop",
      role: Role.SUPERVISOR,
      isActive: true,
    },
  });

  // Create viewer
  const viewerPassword = await bcrypt.hash("viewer123", 10);
  const viewer = await prisma.user.upsert({
    where: { email: "viewer@oversight.local" },
    update: {},
    create: {
      email: "viewer@oversight.local",
      password: viewerPassword,
      firstName: "Amadou",
      lastName: "Ba",
      role: Role.VIEWER,
      isActive: true,
    },
  });

  // Create sites
  const dakar = await prisma.site.create({
    data: { name: "Site Dakar Plateau", address: "Avenue L.S. Senghor", city: "Dakar", country: "SN", latitude: 14.6937, longitude: -17.4441 },
  });

  const paris = await prisma.site.create({
    data: { name: "Site Paris CDG", address: "Rue de la Paix", city: "Paris", country: "FR", latitude: 48.8566, longitude: 2.3522 },
  });

  const lyon = await prisma.site.create({
    data: { name: "Site Lyon Part-Dieu", address: "Bd Vivier Merle", city: "Lyon", country: "FR", latitude: 45.7609, longitude: 4.8596 },
  });

  // Create cameras
  const cameras = await Promise.all([
    prisma.camera.create({ data: { name: "CAM-DKR-001 Entree Principale", rtspUrl: "rtsp://stream:554/dakar-entree", siteId: dakar.id, status: "ONLINE", resolution: "1920x1080", fps: 25, isRecording: true, lastHeartbeat: new Date() } }),
    prisma.camera.create({ data: { name: "CAM-DKR-002 Parking", rtspUrl: "rtsp://stream:554/dakar-parking", siteId: dakar.id, status: "ONLINE", resolution: "1920x1080", fps: 25, isRecording: true, lastHeartbeat: new Date() } }),
    prisma.camera.create({ data: { name: "CAM-PAR-001 Hall Accueil", rtspUrl: "rtsp://stream:554/paris-hall", siteId: paris.id, status: "ONLINE", resolution: "2560x1440", fps: 30, isRecording: true, lastHeartbeat: new Date() } }),
    prisma.camera.create({ data: { name: "CAM-PAR-002 Entrepot", rtspUrl: "rtsp://stream:554/paris-entrepot", siteId: paris.id, status: "OFFLINE", resolution: "1920x1080", fps: 25, isRecording: false } }),
    prisma.camera.create({ data: { name: "CAM-LYN-001 Couloir A", rtspUrl: "rtsp://stream:554/lyon-couloir", siteId: lyon.id, status: "MAINTENANCE", resolution: "1280x720", fps: 15, isRecording: false } }),
    prisma.camera.create({ data: { name: "CAM-LYN-002 Sortie Secours", rtspUrl: "rtsp://stream:554/lyon-sortie", siteId: lyon.id, status: "DEGRADED", resolution: "1920x1080", fps: 10, isRecording: true, lastHeartbeat: new Date(Date.now() - 5 * 60 * 1000) } }),
  ]);

  // Create alerts
  const alertTitles = [
    { title: "Intrusion detectee - Zone restreinte", severity: "CRITICAL" as const, camera: 0 },
    { title: "Mouvement inhabituel - Parking", severity: "HIGH" as const, camera: 1 },
    { title: "Qualite video degradee", severity: "MEDIUM" as const, camera: 5 },
    { title: "Camera hors ligne - Entrepot", severity: "HIGH" as const, camera: 3 },
    { title: "Objet abandonne detecte", severity: "MEDIUM" as const, camera: 2 },
    { title: "Maintenance planifiee", severity: "INFO" as const, camera: 4 },
    { title: "Personne non identifiee", severity: "LOW" as const, camera: 0 },
    { title: "Flux video intermittent", severity: "MEDIUM" as const, camera: 5 },
    { title: "Acces non autorise tente", severity: "CRITICAL" as const, camera: 2 },
    { title: "Notification systeme", severity: "INFO" as const, camera: 1 },
  ];

  for (let i = 0; i < alertTitles.length; i++) {
    const alert = alertTitles[i];
    await prisma.alert.create({
      data: {
        title: alert.title,
        description: `Alerte generee automatiquement par le systeme AI`,
        severity: alert.severity,
        status: i < 3 ? "OPEN" : i < 6 ? "ACKNOWLEDGED" : i < 8 ? "RESOLVED" : "FALSE_POSITIVE",
        cameraId: cameras[alert.camera].id,
        ...(i >= 3 ? { acknowledgedBy: supervisor.id, acknowledgedAt: new Date(Date.now() - (10 - i) * 60 * 60 * 1000) } : {}),
        ...(i >= 6 && i < 8 ? { resolvedBy: admin.id, resolvedAt: new Date(Date.now() - (8 - i) * 60 * 60 * 1000) } : {}),
      },
    });
  }

  console.log("Seed completed:");
  console.log(`  Users: 3 (${admin.email}, ${supervisor.email}, ${viewer.email})`);
  console.log(`  Sites: 3 (${dakar.name}, ${paris.name}, ${lyon.name})`);
  console.log(`  Cameras: ${cameras.length}`);
  console.log(`  Alerts: ${alertTitles.length}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
