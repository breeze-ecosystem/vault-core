import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { SiteService } from "../site.service";
import { PrismaService } from "../../prisma/prisma.service";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPrismaService = {
  organization: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  alert: {
    count: jest.fn(),
  },
  camera: {
    count: jest.fn(),
  },
  face: {
    findMany: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  credential: {
    findMany: jest.fn(),
  },
  zone: {
    count: jest.fn(),
  },
  door: {
    count: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

// ── Test Data ───────────────────────────────────────────────────────────────

const mockChildSite = {
  id: "child-uuid-1",
  name: "Site Niamey",
  address: "Niamey Centre",
  city: "Niamey",
  country: "NE",
  latitude: 13.512,
  longitude: 2.109,
  parentOrganizationId: "parent-uuid-1",
  isActive: true,
  maxSites: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { cameras: 10, doors: 4, members: 8, alerts: 2, faces: 5, zones: 3 },
};

const mockParentOrg = {
  id: "parent-uuid-1",
  name: "Parent Organization",
  maxSites: 5,
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("SiteService (multi-site)", () => {
  let service: SiteService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiteService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SiteService>(SiteService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe("findAll", () => {
    it("should list child sites for parent org", async () => {
      mockPrismaService.organization.findMany.mockResolvedValue([mockChildSite]);
      mockPrismaService.organization.count.mockResolvedValue(1);

      const result = await service.findAll({
        parentOrganizationId: "parent-uuid-1",
      });

      expect(result).toEqual({ data: [mockChildSite], total: 1, page: 1, limit: 50 });
      expect(mockPrismaService.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parentOrganizationId: "parent-uuid-1",
          }),
        }),
      );
    });

    it("should return empty list when no child sites exist", async () => {
      mockPrismaService.organization.findMany.mockResolvedValue([]);
      mockPrismaService.organization.count.mockResolvedValue(0);

      const result = await service.findAll({
        parentOrganizationId: "parent-uuid-1",
      });

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 50 });
    });
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe("create", () => {
    it("should create a child site under parent org", async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(mockParentOrg);
      mockPrismaService.organization.count.mockResolvedValue(2); // 2 < 5 max
      mockPrismaService.organization.create.mockResolvedValue(mockChildSite);

      const result = await service.create(
        { name: "Site Niamey", city: "Niamey", country: "NE" },
        "parent-uuid-1",
      );

      expect(result).toEqual(mockChildSite);
      expect(mockPrismaService.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Site Niamey",
            parentOrganizationId: "parent-uuid-1",
          }),
        }),
      );
    });

    it("should enforce maxSites limit — throw ForbiddenException", async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(mockParentOrg);
      mockPrismaService.organization.count.mockResolvedValue(5); // 5 >= 5 max

      await expect(
        service.create({ name: "Extra Site" }, "parent-uuid-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException if parent org not found", async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ name: "Site" }, "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── findById ────────────────────────────────────────────────────────────

  describe("findById", () => {
    it("should return a site by id with relation counts", async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(mockChildSite);

      const result = await service.findById("child-uuid-1");

      expect(result).toEqual(mockChildSite);
      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledWith({
        where: { id: "child-uuid-1" },
        include: {
          _count: {
            select: {
              cameras: true,
              doors: true,
              members: true,
              alerts: true,
              faces: true,
              zones: true,
            },
          },
          parent: { select: { id: true, name: true } },
        },
      });
    });

    it("should throw NotFoundException if site not found", async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.findById("nonexistent")).rejects.toThrow(NotFoundException);
    });
  });

  // ── getAggregateStats ───────────────────────────────────────────────────

  describe("getAggregateStats", () => {
    it("should aggregate stats across child sites", async () => {
      mockPrismaService.organization.findMany.mockResolvedValue([mockChildSite]);
      mockPrismaService.alert.count.mockResolvedValue(3);
      mockPrismaService.$queryRaw.mockResolvedValue([
        { organizationId: "child-uuid-1", total: 10n, online: 8n },
      ]);

      const result = await service.getAggregateStats("parent-uuid-1");

      expect(result.totals.sites).toBe(1);
      expect(result.totals.cameras).toBe(10);
      expect(result.totals.camerasOnline).toBe(8);
      expect(result.totals.activeAlerts).toBe(3);
      expect(result.totals.avgUptime).toBe("80%");
      expect(result.perSite).toHaveLength(1);
      expect(result.perSite[0].name).toBe("Site Niamey");
    });

    it("should return zeros when no child sites exist", async () => {
      mockPrismaService.organization.findMany.mockResolvedValue([]);

      const result = await service.getAggregateStats("parent-empty");

      expect(result.totals.sites).toBe(0);
      expect(result.totals.cameras).toBe(0);
      expect(result.totals.activeAlerts).toBe(0);
      expect(result.perSite).toHaveLength(0);
    });
  });

  // ── globalSearch ────────────────────────────────────────────────────────

  describe("globalSearch", () => {
    it("should search across child sites and tag results with site name", async () => {
      mockPrismaService.organization.findMany.mockResolvedValue([mockChildSite]);
      mockPrismaService.alert.findMany.mockResolvedValue([
        {
          id: "alert-1",
          title: "Intrusion détectée",
          description: "Zone sécurisée",
          severity: "HIGH",
          status: "OPEN",
          createdAt: new Date(),
          organizationId: "child-uuid-1",
        },
      ]);
      mockPrismaService.face.findMany.mockResolvedValue([]);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.credential.findMany.mockResolvedValue([]);

      const result = await service.globalSearch("parent-uuid-1", "Intrusion");

      expect(result.events).toHaveLength(1);
      expect(result.events[0].siteName).toBe("Site Niamey");
      expect(result.events[0].title).toBe("Intrusion détectée");
    });

    it("should return empty results when no child sites exist", async () => {
      mockPrismaService.organization.findMany.mockResolvedValue([]);

      const result = await service.globalSearch("parent-empty", "test");

      expect(result).toEqual({ events: [], people: [], credentials: [] });
    });
  });

  // ── update ──────────────────────────────────────────────────────────────

  describe("update", () => {
    it("should update a child site", async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(mockChildSite);
      mockPrismaService.organization.update.mockResolvedValue({
        ...mockChildSite,
        name: "Updated Site Name",
      });

      const result = await service.update("child-uuid-1", {
        name: "Updated Site Name",
      });

      expect(result.name).toBe("Updated Site Name");
    });

    it("should throw NotFoundException if site not found on update", async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.update("nonexistent", { name: "Test" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────

  describe("remove", () => {
    it("should soft-delete a site (set isActive=false)", async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(mockChildSite);
      mockPrismaService.organization.update.mockResolvedValue({
        ...mockChildSite,
        isActive: false,
      });

      const result = await service.remove("child-uuid-1");

      expect(result.isActive).toBe(false);
      expect(mockPrismaService.organization.update).toHaveBeenCalledWith({
        where: { id: "child-uuid-1" },
        data: { isActive: false },
      });
    });

    it("should throw NotFoundException if site not found on remove", async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.remove("nonexistent")).rejects.toThrow(NotFoundException);
    });
  });
});
