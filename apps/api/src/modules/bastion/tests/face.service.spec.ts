import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { BastionService } from "../bastion.service";
import { PrismaService } from "../../prisma/prisma.service";
import { QdrantService } from "../../ai-agent/qdrant/qdrant.service";
import { EventEmitter2 } from "@nestjs/event-emitter";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPrismaService = {
  face: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  facePassage: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const mockQdrantService = {
  ensureFacesCollection: jest.fn(),
  upsertFaces: jest.fn(),
  searchFaces: jest.fn(),
  deleteFacePoints: jest.fn(),
  setFacePayload: jest.fn(),
};

const mockEventEmitter = {
  emit: jest.fn(),
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

// ── Test Data ───────────────────────────────────────────────────────────────

const mockFace = {
  id: "face-uuid-1",
  organizationId: "org-uuid-1",
  name: "Jean Dupont",
  photoBase64: "/9j/4AAQSkZJRg...",
  embeddingBase64: "AAAAF3...",
  qdrantPointId: "qdrant-point-uuid-1",
  isBlacklisted: false,
  riskThreshold: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockBlacklistedFace = {
  ...mockFace,
  id: "face-uuid-2",
  name: "Personne Blacklistée",
  isBlacklisted: true,
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("BastionService (face operations)", () => {
  let service: BastionService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BastionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: QdrantService, useValue: mockQdrantService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: "REDIS", useValue: mockRedis },
      ],
    }).compile();

    service = module.get<BastionService>(BastionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ── listFaces ──────────────────────────────────────────────────────────────

  describe("listFaces", () => {
    it("should return paginated faces", async () => {
      mockPrismaService.face.findMany.mockResolvedValue([mockFace]);
      mockPrismaService.face.count.mockResolvedValue(1);

      const result = await service.listFaces({
        organizationId: "org-uuid-1",
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({ data: [mockFace], total: 1, page: 1, limit: 20 });
      expect(mockPrismaService.face.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: "org-uuid-1" }),
        }),
      );
    });

    it("should filter by blacklisted status", async () => {
      mockPrismaService.face.findMany.mockResolvedValue([mockBlacklistedFace]);
      mockPrismaService.face.count.mockResolvedValue(1);

      await service.listFaces({ blacklisted: true });

      expect(mockPrismaService.face.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isBlacklisted: true }),
        }),
      );
    });

    it("should return empty list when no faces exist", async () => {
      mockPrismaService.face.findMany.mockResolvedValue([]);
      mockPrismaService.face.count.mockResolvedValue(0);

      const result = await service.listFaces({ organizationId: "org-uuid-1" });

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });
  });

  // ── getFace ────────────────────────────────────────────────────────────────

  describe("getFace", () => {
    it("should return a face by id", async () => {
      mockPrismaService.face.findUnique.mockResolvedValue(mockFace);

      const result = await service.getFace("face-uuid-1");

      expect(result).toEqual(mockFace);
      expect(mockPrismaService.face.findUnique).toHaveBeenCalledWith({
        where: { id: "face-uuid-1" },
        include: { organization: { select: { id: true, name: true } } },
      });
    });

    it("should throw NotFoundException if face not found", async () => {
      mockPrismaService.face.findUnique.mockResolvedValue(null);

      await expect(service.getFace("nonexistent")).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateFace ─────────────────────────────────────────────────────────────

  describe("updateFace", () => {
    it("should update face name", async () => {
      mockPrismaService.face.findUnique.mockResolvedValue(mockFace);
      mockPrismaService.face.update.mockResolvedValue({
        ...mockFace,
        name: "Updated Name",
      });

      const result = await service.updateFace("face-uuid-1", { name: "Updated Name" });

      expect(result.name).toBe("Updated Name");
      expect(mockPrismaService.face.update).toHaveBeenCalledWith({
        where: { id: "face-uuid-1" },
        data: { name: "Updated Name" },
      });
    });

    it("should throw NotFoundException if face not found on update", async () => {
      mockPrismaService.face.findUnique.mockResolvedValue(null);

      await expect(service.updateFace("nonexistent", { name: "Test" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── deleteFace ─────────────────────────────────────────────────────────────

  describe("deleteFace", () => {
    it("should delete face from Prisma and Qdrant", async () => {
      mockPrismaService.face.findUnique.mockResolvedValue(mockFace);
      mockPrismaService.face.delete.mockResolvedValue(mockFace);
      mockQdrantService.deleteFacePoints.mockResolvedValue(undefined);

      const result = await service.deleteFace("face-uuid-1");

      expect(result).toEqual({ deleted: true, id: "face-uuid-1" });
      expect(mockPrismaService.face.delete).toHaveBeenCalledWith({
        where: { id: "face-uuid-1" },
      });
      expect(mockQdrantService.deleteFacePoints).toHaveBeenCalledWith([
        mockFace.qdrantPointId,
      ]);
    });

    it("should throw NotFoundException if face not found on delete", async () => {
      mockPrismaService.face.findUnique.mockResolvedValue(null);

      await expect(service.deleteFace("nonexistent")).rejects.toThrow(NotFoundException);
    });
  });

  // ── toggleBlacklist ────────────────────────────────────────────────────────

  describe("toggleBlacklist", () => {
    it("should toggle blacklist status from false to true", async () => {
      const faceWithOrg = { ...mockFace, organization: { id: "org-uuid-1" } };
      mockPrismaService.face.findUnique.mockResolvedValue(faceWithOrg);
      mockPrismaService.face.update.mockResolvedValue({
        ...mockFace,
        isBlacklisted: true,
      });

      const result = await service.toggleBlacklist("face-uuid-1");

      expect(result.isBlacklisted).toBe(true);
      expect(mockPrismaService.face.update).toHaveBeenCalledWith({
        where: { id: "face-uuid-1" },
        data: { isBlacklisted: true },
      });
      expect(mockQdrantService.setFacePayload).toHaveBeenCalledWith(
        mockFace.qdrantPointId,
        { isBlacklisted: true },
      );
    });

    it("should toggle blacklist status from true to false", async () => {
      const blacklistedWithOrg = {
        ...mockBlacklistedFace,
        organization: { id: "org-uuid-1" },
      };
      mockPrismaService.face.findUnique.mockResolvedValue(blacklistedWithOrg);
      mockPrismaService.face.update.mockResolvedValue({
        ...mockBlacklistedFace,
        isBlacklisted: false,
      });

      const result = await service.toggleBlacklist("face-uuid-2");

      expect(result.isBlacklisted).toBe(false);
      expect(mockQdrantService.setFacePayload).toHaveBeenCalledWith(
        mockBlacklistedFace.qdrantPointId,
        { isBlacklisted: false },
      );
    });

    it("should throw NotFoundException if face not found on toggle", async () => {
      mockPrismaService.face.findUnique.mockResolvedValue(null);

      await expect(service.toggleBlacklist("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
