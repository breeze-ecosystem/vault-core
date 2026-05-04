import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

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

  const dakar = await prisma.site.create({
    data: { name: "Site Dakar Plateau", address: "Avenue L.S. Senghor", city: "Dakar", country: "SN", latitude: 14.6937, longitude: -17.4441 },
  });

  const paris = await prisma.site.create({
    data: { name: "Site Paris CDG", address: "Rue de la Paix", city: "Paris", country: "FR", latitude: 48.8566, longitude: 2.3522 },
  });

  const lyon = await prisma.site.create({
    data: { name: "Site Lyon Part-Dieu", address: "Bd Vivier Merle", city: "Lyon", country: "FR", latitude: 45.7609, longitude: 4.8596 },
  });

  const cameras = await Promise.all([
    prisma.camera.create({ data: { name: "CAM-DKR-001 Entree Principale", rtspUrl: "rtsp://stream:554/dakar-entree", siteId: dakar.id, status: "ONLINE", resolution: "1920x1080", fps: 25, captureInterval: 5, isRecording: false } }),
    prisma.camera.create({ data: { name: "CAM-DKR-002 Parking", rtspUrl: "rtsp://stream:554/dakar-parking", siteId: dakar.id, status: "ONLINE", resolution: "1920x1080", fps: 25, captureInterval: 5, isRecording: false } }),
    prisma.camera.create({ data: { name: "CAM-PAR-001 Hall Accueil", rtspUrl: "rtsp://stream:554/paris-hall", siteId: paris.id, status: "ONLINE", resolution: "2560x1440", fps: 30, captureInterval: 10, isRecording: false } }),
    prisma.camera.create({ data: { name: "CAM-PAR-002 Entrepot", rtspUrl: "rtsp://stream:554/paris-entrepot", siteId: paris.id, status: "OFFLINE", resolution: "1920x1080", fps: 25, captureInterval: 5, isRecording: false } }),
    prisma.camera.create({ data: { name: "CAM-LYN-001 Couloir A", rtspUrl: "rtsp://stream:554/lyon-couloir", siteId: lyon.id, status: "MAINTENANCE", resolution: "1280x720", fps: 15, captureInterval: 5, isRecording: false } }),
    prisma.camera.create({ data: { name: "CAM-LYN-002 Sortie Secours", rtspUrl: "rtsp://stream:554/lyon-sortie", siteId: lyon.id, status: "DEGRADED", resolution: "1920x1080", fps: 10, captureInterval: 5, isRecording: false } }),
  ]);

  // Camera prompts - natural language detection rules
  const promptData = [
    { cameraIdx: 0, text: "Y a-t-il une personne qui entre dans la zone sans badge visible ?", severity: "HIGH" as const },
    { cameraIdx: 0, text: "Detecter si quelqu'un porte un casque de securite", severity: "MEDIUM" as const },
    { cameraIdx: 1, text: "Y a-t-il un vehicule stationne de maniere suspecte ?", severity: "HIGH" as const },
    { cameraIdx: 1, text: "Detecter un colis ou objet abandonne", severity: "CRITICAL" as const },
    { cameraIdx: 2, text: "Detecter une intrusion en dehors des heures d'ouverture", severity: "CRITICAL" as const },
    { cameraIdx: 2, text: "Y a-t-il plus de 10 personnes dans le hall ?", severity: "MEDIUM" as const },
    { cameraIdx: 4, text: "Detecter un mouvement dans le couloir apres 22h", severity: "HIGH" as const },
    { cameraIdx: 5, text: "La sortie de secours est-elle bloquee ?", severity: "CRITICAL" as const },
  ];

  for (const p of promptData) {
    await prisma.cameraPrompt.create({
      data: {
        cameraId: cameras[p.cameraIdx].id,
        text: p.text,
        severity: p.severity,
        isActive: true,
      },
    });
  }

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
  console.log(`  Users: 3`);
  console.log(`  Sites: 3`);
  console.log(`  Cameras: ${cameras.length}`);
  console.log(`  Camera Prompts: ${promptData.length}`);
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
