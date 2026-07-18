# Phase 3: BASTION AI & Access Control — Pattern Map

**Mapped:** 2026-07-18
**Files analyzed:** 38 total (18 new, 20 modified)
**Analogs found:** 35 / 38 (3 with no close analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `services/ai-preprocessor/app/routes/detection_bastion.py` | route | request-response | `services/ai-preprocessor/app/routes/detection.py` | exact |
| `services/ai-preprocessor/app/schemas/bastion.py` | schema | request-response | `services/ai-preprocessor/app/schemas/face_recognition.py` | exact |
| `services/ai-preprocessor/app/models/detector.py` (MODIFY) | model | batch | same file (existing) | exact |
| `services/ai-preprocessor/app/models/face_recogniser.py` (MODIFY) | model | batch | same file (existing) | exact |
| `services/ai-preprocessor/app/models/tracker.py` (MODIFY) | model | batch | same file (existing) | exact |
| `services/ai-preprocessor/app/config.py` (MODIFY) | config | static | same file (existing) | exact |
| `services/ai-preprocessor/app/routes/detection.py` (MODIFY) | route | request-response | same file (existing) | exact |
| `services/ai-preprocessor/app/routes/face_recognition.py` (MODIFY) | route | request-response | same file (existing) | exact |
| `services/ai-preprocessor/app/main.py` (MODIFY) | config | static | same file (existing) | exact |
| `apps/api/src/modules/bastion/bastion.module.ts` | module | config | `apps/api/src/modules/access/access.module.ts` | role-match |
| `apps/api/src/modules/bastion/bastion.controller.ts` | controller | CRUD | `apps/api/src/modules/access/access.controller.ts` | role-match |
| `apps/api/src/modules/bastion/bastion.service.ts` | service | CRUD | `apps/api/src/modules/access/access.service.ts` | role-match |
| `apps/api/src/modules/bastion/face/face.controller.ts` | controller | CRUD | `apps/api/src/modules/organization/organization.controller.ts` | role-match |
| `apps/api/src/modules/bastion/face/face.service.ts` | service | CRUD | `apps/api/src/modules/ai-agent/qdrant/qdrant.service.ts` | partial |
| `apps/api/src/modules/bastion/face/face.processor.ts` | processor | event-driven | `apps/api/src/modules/access/access.processor.ts` | exact |
| `apps/api/src/modules/multi-site/site.controller.ts` | controller | request-response | `apps/api/src/modules/site/site.controller.ts` | role-match |
| `apps/api/src/modules/multi-site/site.service.ts` | service | CRUD | `apps/api/src/modules/organization/organization.service.ts` | role-match |
| `apps/api/src/modules/multi-site/site.module.ts` | module | config | `apps/api/src/modules/organization/organization.module.ts` | exact |
| `apps/api/prisma/schema.prisma` (MODIFY) | model | CRUD | same file (existing) | exact |
| `apps/api/src/modules/access/access.service.ts` (MODIFY) | service | CRUD | same file (existing) | exact |
| `apps/api/src/modules/access/access.controller.ts` (MODIFY) | controller | CRUD | same file (existing) | exact |
| `apps/api/src/modules/access/access.processor.ts` (MODIFY) | processor | event-driven | same file (existing) | exact |
| `apps/api/src/modules/door/door.service.ts` (MODIFY) | service | event-driven | same file (existing) | exact |
| `apps/api/src/modules/ai-agent/qdrant/qdrant.service.ts` (MODIFY) | service | CRUD | same file (existing) | exact |
| `apps/api/src/common/guards/tenant-isolation.guard.ts` (MODIFY) | middleware | request-response | same file (existing) | exact |
| `apps/api/src/modules/site/site.service.ts` (MODIFY) | service | CRUD | same file (existing) | exact |
| `packages/shared/src/constants/roles.ts` (MODIFY) | utility | static | same file (existing) | exact |
| `packages/shared/src/constants/credential-types.ts` (MODIFY) | utility | static | same file (existing) | exact |
| `packages/shared/src/schemas/access.schema.ts` (MODIFY) | schema | static | same file (existing) | exact |
| `packages/shared/src/index.ts` (MODIFY) | utility | static | same file (existing) | exact |
| `apps/api/src/modules/license/` (MODIFY) | service | CRUD | same file (existing) | exact |
| `apps/dashboard/app/(dashboard)/bastion/` (NEW) | component | request-response | `apps/dashboard/app/(dashboard)/visages/page.tsx` | role-match |
| `apps/dashboard/app/(dashboard)/sites/[id]/page.tsx` (NEW) | component | request-response | `apps/dashboard/app/(dashboard)/sites/page.tsx` | exact |
| `apps/dashboard/lib/api.ts` (MODIFY) | utility | request-response | same file (existing) | exact |
| `apps/mobile/app/(tabs)/acces/index.tsx` (MODIFY) | component | request-response | same file (existing) | exact |
| `apps/mobile/app/visages/ajouter.tsx` (MODIFY) | component | request-response | same file (existing) | exact |
| `apps/mobile/lib/api.ts` (MODIFY) | utility | request-response | same file (existing) | exact |

---

## Pattern Assignments

### AI Preprocessor — New Route: `detection_bastion.py`

**Analog:** `services/ai-preprocessor/app/routes/detection.py` (403 lines)

**Imports pattern** (lines 1-28):
```python
import asyncio
import base64
import io
import logging
import time

import cv2
import httpx
import numpy as np
import supervision as sv
from fastapi import APIRouter, HTTPException
from PIL import Image
from pydantic import BaseModel

from app.config import settings
from app.models.detector import detect, get_detector
from app.models.face_recogniser import (
    get_face_recogniser,
    get_frame_buffer,
    is_dark_frame,
    match_whitelist,
    prune_stale_buffers,
)
from app.models.tracker import get_tracker, track

logger = logging.getLogger(__name__)
router = APIRouter()
```

**Core Pydantic models pattern** (lines 34-68):
```python
class DetectionRequest(BaseModel):
    camera_id: str
    image_base64: str
    timestamp: str | None = None
    confidence: float = 0.45
    organization_id: str
    detection_zones: list[list[list[float]]] = []

class DetectionResult(BaseModel):
    class_name: str
    confidence: float
    bbox: list[float]
    tracker_id: int | None = None
    class_id: int
    face_match: dict | None = None
    in_zone: bool = True

class DetectionResponse(BaseModel):
    detections: list[DetectionResult]
    camera_id: str
    processing_time_ms: float
    face_matches: list[dict] = []
    zone_hits: list[bool] = []
    enhancement_applied: bool = False
```

**Core detection pipeline pattern** (lines 126-364):
```python
@router.post("/detect", response_model=DetectionResponse)
async def detect_objects(request: DetectionRequest):
    start = time.time()
    loop = asyncio.get_running_loop()

    # Decode base64 image
    try:
        image_data = base64.b64decode(request.image_base64)
        image = Image.open(io.BytesIO(image_data))
    except Exception as e:
        logger.error("Failed to decode image: %s", e)
        raise HTTPException(status_code=400, detail="Invalid image data")

    frame = np.array(image.convert("RGB"))

    # Run YOLOv12 detection in executor (CPU-bound → executor)
    detections_sv = await loop.run_in_executor(
        None, lambda: detect(frame, confidence=request.confidence),
    )

    if len(detections_sv) == 0:
        elapsed = round((time.time() - start) * 1000, 2)
        return DetectionResponse(detections=[], ...)

    # Zone filtering (supervision PolygonZone)
    if request.detection_zones:
        in_any_zone = np.zeros(len(detections_sv), dtype=bool)
        for polygon_verts in request.detection_zones:
            polygon = np.array(polygon_verts, dtype=np.int32)
            zone = sv.PolygonZone(
                polygon=polygon,
                frame_resolution_wh=(frame.shape[1], frame.shape[0]),
            )
            in_any_zone |= zone.trigger(detections=detections_sv)
        detections_sv = detections_sv[in_any_zone]

    # ByteTrack cross-frame tracking
    detections_tracked = track(detections_sv)

    # Notify NestJS (fire-and-forget via httpx)
    await _notify_nestjs(results, request.camera_id, request.organization_id, ...)

    elapsed = round((time.time() - start) * 1000, 2)
    return DetectionResponse(detections=results, camera_id=request.camera_id, processing_time_ms=elapsed, ...)
```

**Error handling pattern** (lines 140-147, 370-403):
```python
# Input validation - fail fast on corrupt data
try:
    image_data = base64.b64decode(request.image_base64)
    image = Image.open(io.BytesIO(image_data))
except Exception as e:
    logger.error("Failed to decode image: %s", e)
    raise HTTPException(status_code=400, detail="Invalid image data")

# Face recognition errors swallowed, logged (non-blocking)
def _run_face_rec_on_crop(crop_bgr, match_threshold):
    try:
        face_recogniser = get_face_recogniser()
        faces = face_recogniser.get(crop_bgr)
        if not faces:
            return None
        # ... matching logic ...
    except Exception as e:
        logger.error("Face recognition error on crop: %s", e)
        return None
```

---

### AI Preprocessor — New Schemas: `schemas/bastion.py`

**Analog:** `services/ai-preprocessor/app/schemas/face_recognition.py` (64 lines)

**Pattern to follow** (entire file — same style, same structure):
```python
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field

class FaceWhitelistEntry(BaseModel):
    id: str
    name: str
    embedding_base64: str
    created_at: str | None = None
    updated_at: str | None = None

class FaceRecognitionRequest(BaseModel):
    camera_id: str
    image_base64: str
    timestamp: str | None = None
    organization_id: str
    min_face_size: int = 80
    match_threshold: float = 0.48

    @classmethod
    def clamp_threshold(cls, v: float) -> float:
        return max(0.20, min(0.95, v))

class FaceRecognitionResponse(BaseModel):
    faces: list[FaceMatch]
    camera_id: str
    processing_time_ms: float
    total_whitelist_size: int

class FaceRegistrationRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    image_base64: str
    organization_id: str
```

---

### AI Preprocessor — `models/detector.py` (MODIFY: weapons fine-tuning)

**Analog:** same file (existing) — 48 lines

**Lazy singleton pattern** (lines 9-26):
```python
_yolo_model = None

def get_detector(model_name: str | None = None):
    global _yolo_model
    if _yolo_model is None:
        name = model_name or settings.DETECTION_MODEL
        logger.info("Loading YOLO model: %s (first call may be slow)...", name)
        from ultralytics import YOLO
        _yolo_model = YOLO(name)
    return _yolo_model

def detect(frame: np.ndarray, confidence: float | None = None):
    import numpy as np
    import supervision as sv
    conf = confidence if confidence is not None else settings.DETECTION_CONFIDENCE
    model = get_detector()
    results = model(frame, conf=conf)[0]
    detections = sv.Detections.from_ultralytics(results)
    return detections
```

---

### AI Preprocessor — `models/face_recogniser.py` (MODIFY: anti-spoofing, blacklist, Qdrant sync)

**Analog:** same file (existing) — 148 lines

**Lazy singleton + whitelist cache pattern** (lines 16-37, 42-103):
```python
_face_app: "FaceAnalysis | None" = None

def get_face_recogniser():
    global _face_app
    if _face_app is None:
        from insightface.app import FaceAnalysis
        logger.info("Loading insightface FaceAnalysis (buffalo_l, CPU-only)...")
        _face_app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"],
        )
        _face_app.prepare(ctx_id=-1)
    return _face_app

# Whitelist cache pattern (NestJS → AI Preprocessor)
_whitelist_cache: list[dict] = []
_last_cache_refresh: float = 0.0

async def refresh_whitelist_cache() -> None:
    global _whitelist_cache, _last_cache_refresh
    import httpx
    url = f"{settings.NESTJS_API_URL}/api/internal/face-whitelist"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
        entries: list[dict] = []
        for entry in data:
            emb_bytes = base64.b64decode(entry["embedding_base64"])
            emb = np.frombuffer(emb_bytes, dtype=np.float32).copy()
            entries.append({"id": entry["id"], "name": entry["name"], "embedding": emb})
        _whitelist_cache = entries
        _last_cache_refresh = time.time()
    except Exception as e:
        logger.error("Whitelist refresh failed (using stale cache): %s", e)

def match_whitelist(embedding: np.ndarray) -> tuple[float, str | None]:
    best_sim = -1.0
    best_id: str | None = None
    for entry in _whitelist_cache:
        sim = float(np.dot(embedding, entry["embedding"]))
        if sim > best_sim:
            best_sim = sim
            best_id = entry["id"]
    return best_sim, best_id
```

---

### AI Preprocessor — `models/tracker.py` (MODIFY: abandoned object timer)

**Analog:** same file (existing) — 39 lines

**ByteTrack lazy singleton pattern** (entire file):
```python
_tracker = None

def get_tracker():
    global _tracker
    if _tracker is None:
        logger.info("Initializing ByteTrack tracker via supervision...")
        from supervision import ByteTrack
        _tracker = ByteTrack()
    return _tracker

def track(detections):
    import supervision as sv
    tracker = get_tracker()
    tracked = tracker.update_with_detections(detections)
    return tracked
```

---

### AI Preprocessor — `main.py` (MODIFY: register new routes)

**Analog:** same file (existing) — 26 lines

**Route registration pattern** (lines 1-26):
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import health, inference, anpr, detection, audio, face_recognition, enhance

app = FastAPI(title="OVERSIGHT AI - Preprocessor", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(detection.router, prefix=settings.API_V1_PREFIX)
app.include_router(face_recognition.router, prefix=settings.API_V1_PREFIX)
# + New: app.include_router(detection_bastion.router, prefix=settings.API_V1_PREFIX)
```

---

### NestJS — `bastion/bastion.module.ts` (NEW)

**Analog:** `apps/api/src/modules/access/access.module.ts` (37 lines)

**Module pattern** (entire file):
```typescript
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import Redis from "ioredis";
import { BastionController } from "./bastion.controller";
import { BastionService } from "./bastion.service";

const RedisProvider = {
  provide: "REDIS",
  useFactory: (cfg: ConfigService) => {
    return new Redis({
      host: cfg.get("redis.host", "localhost"),
      port: cfg.get("redis.port", 6379),
      password: cfg.get("redis.password") || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  },
  inject: [ConfigService],
};

@Module({
  imports: [
    BullModule.registerQueue({ name: "bastion-events" }),
  ],
  controllers: [BastionController],
  providers: [BastionService, RedisProvider],
  exports: [BastionService],
})
export class BastionModule {}
```

---

### NestJS — `bastion/bastion.controller.ts` (NEW)

**Analog:** `apps/api/src/modules/access/access.controller.ts` (204 lines)

**Imports + controller pattern** (lines 1-30, 34-83):
```typescript
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { BastionService } from "./bastion.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import { Audited } from "../../common/decorators/audited.decorator";
import { RequiresPack, RequiresModule } from "../../common/decorators/feature-gate.decorator";
import { createFaceSchema } from "@repo/shared";

@Controller("bastion")
@RequiresPack("BASTION")
export class BastionController {
  constructor(private bastionService: BastionService) {}

  @Post("faces")
  @Audited({ entity: "face", action: "CREATE", captureChanges: true })
  @Roles("ADMIN", "SUPER_ADMIN", "GLOBAL_ADMIN")
  @RequiresModule("advanced_facial_recognition")
  async enrollFace(@Body(new ZodValidationPipe(createFaceSchema)) body: any) {
    return this.bastionService.enrollFace(body);
  }

  @Get("faces")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "GLOBAL_ADMIN")
  @RequiresModule("advanced_facial_recognition")
  async listFaces(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Req() req?: FastifyRequest,
  ) {
    const user = (req as any)?.user;
    return this.bastionService.listFaces({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      organizationId: user?.orgId,
    });
  }
  // ...
}
```

**Key decorator chain pattern:**
- `@Audited({ entity, action })` — every mutation endpoint
- `@Roles(...)` — role-based access
- `@RequiresPack("BASTION")` — pack gate on controller level
- `@RequiresModule("advanced_facial_recognition")` — module-specific gate
- `@Body(new ZodValidationPipe(schema))` — Zod validation for payloads

---

### NestJS — `bastion/bastion.service.ts` (NEW)

**Analog:** `apps/api/src/modules/ai-agent/qdrant/qdrant.service.ts` (233 lines) + `apps/api/src/modules/access/access.service.ts` (532 lines)

**Service pattern** (imports and structure):
```typescript
import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import Redis from "ioredis";

@Injectable()
export class BastionService {
  private readonly logger = new Logger(BastionService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @Inject("REDIS") private redis: Redis,
  ) {}

  async enrollFace(dto: { name: string; photoBase64: string; organizationId: string }) {
    // 1. Call AI Preprocessor to extract embedding
    // 2. Store embedding in Qdrant `faces` collection
    // 3. Store face metadata in Prisma `Face` model
    // 4. Refresh AI Preprocessor whitelist cache
    // 5. Audit log
  }

  // Prisma CRUD pattern (from access.service.ts)
  async listFaces(filters?: { organizationId?: string; page?: number; limit?: number }) {
    const where: Record<string, any> = {};
    if (filters?.organizationId) where.organizationId = filters.organizationId;
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const [data, total] = await Promise.all([
      this.prisma.face.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.face.count({ where }),
    ]);
    return { data, total, page, limit };
  }
}
```

---

### NestJS — `bastion/face/face.processor.ts` (NEW)

**Analog:** `apps/api/src/modules/access/access.processor.ts` (60 lines)

**BullMQ processor pattern** (entire file):
```typescript
import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { withTenantContext } from "../../common/helpers/tenant-worker";

@Processor("bastion-events")
export class FaceProcessor extends WorkerHost {
  private readonly logger = new Logger(FaceProcessor.name);
  constructor(private prisma: PrismaService) { super(); }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case "face-passage":
        return this.persistFacePassage(job.data);
      case "blacklist-alert":
        return this.dispatchBlacklistAlert(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async persistFacePassage(data: any) {
    const { orgId } = data;
    if (!orgId) return { skipped: true, reason: "missing-org-id" };
    return withTenantContext(this.prisma, orgId, async () => {
      try {
        // Write face passage to database
      } catch (err: any) {
        this.logger.error(`Failed to persist face passage: ${err.message}`);
        throw err;
      }
    });
  }
}
```

---

### NestJS — `multi-site/site.module.ts` (NEW)

**Analog:** `apps/api/src/modules/organization/organization.module.ts` (12 lines)

**Simple module pattern**:
```typescript
import { Module } from "@nestjs/common";
import { SiteController } from "./site.controller";
import { SiteService } from "./site.service";

@Module({
  controllers: [SiteController],
  providers: [SiteService],
  exports: [SiteService],
})
export class MultiSiteModule {}
```

---

### NestJS — `multi-site/site.controller.ts` (NEW)

**Analog:** `apps/api/src/modules/organization/organization.controller.ts` (145 lines)

**Controller with `@RequiresPack("BASTION")`**:
```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { SiteService } from './site.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiresPack } from '../../common/decorators/feature-gate.decorator';
import { AuditService } from '../audit/audit.service';
import { createSiteSchema } from '@repo/shared';

@Controller('sites')
@RequiresPack("BASTION")
export class SiteController {
  constructor(
    private siteService: SiteService,
    private auditService: AuditService,
  ) {}

  @Get()
  @Roles("GLOBAL_ADMIN", "SUPER_ADMIN")
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.siteService.findAll({ page: page ? parseInt(page, 10) : undefined, limit: limit ? parseInt(limit, 10) : undefined });
  }
  // ... CRUD with audit logging
}
```

---

### NestJS — `multi-site/site.service.ts` (NEW)

**Analog:** `apps/api/src/modules/organization/organization.service.ts` (130 lines)

**Service pattern with parent-child hierarchy extension**:
```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class SiteService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { parentOrganizationId?: string; page?: number; limit?: number }) {
    const where: Prisma.OrganizationWhereInput = {};
    if (filters?.parentOrganizationId) where.parentOrganizationId = filters.parentOrganizationId;

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        include: { _count: { select: { cameras: true, members: true, doors: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.organization.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getAggregateStats(parentOrgId: string) {
    // Aggregate cameras, alerts, storage, uptime across child orgs
    const children = await this.prisma.organization.findMany({
      where: { parentOrganizationId: parentOrgId },
      include: {
        _count: { select: { cameras: true, doors: true, members: true } },
      },
    });
    // Compute aggregates
    return { sites: children, totals: { cameras: ..., alerts: ..., } };
  }
}
```

---

### Prisma Schema — `schema.prisma` (MODIFY: new models/fields)

**Analog:** same file (existing) — 1007 lines

**New models to add — follow existing patterns:**
```prisma
enum CredentialType {
  BADGE
  PIN
  MOBILE
  QR
  FINGERPRINT    // NEW
  FACE           // NEW
}

model Face {
  id              String   @id @default(uuid())
  organizationId  String
  name            String
  photoBase64     String
  embeddingBase64 String?  // Base64-encoded float32 array (512-d)
  qdrantPointId   String?  // UUID pointing to Qdrant `faces` collection point
  isBlacklisted   Boolean  @default(false)
  riskThreshold   Int?     @default(85) // Per-person auto-unlock threshold
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id])
  @@index([organizationId])
  @@index([isBlacklisted])
}

model AccessGroup {
  id             String   @id @default(uuid())
  name           String
  organizationId String
  description    String?
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id])
  members       OrganizationMember[]
  @@index([organizationId])
}

model CredentialSiteAccess {
  id             String   @id @default(uuid())
  credentialId   String
  organizationId String  // child site
  isActive       Boolean @default(true)
  createdAt      DateTime @default(now())

  credential   Credential   @relation(fields: [credentialId], references: [id])
  organization Organization @relation(fields: [organizationId], references: [id])
  @@unique([credentialId, organizationId])
}

// EXTEND Organization model with:
// parentOrganizationId String?
// parent              Organization? @relation("OrgHierarchy", fields: [parentOrganizationId], references: [id])
// children            Organization[] @relation("OrgHierarchy")
// maxSites            Int @default(1)
```

---

### Qdrant Service — `qdrant.service.ts` (MODIFY: add `faces` collection)

**Analog:** same file (existing) — 233 lines

**Add face collection pattern** (add to COLLECTIONS + new methods):
```typescript
// ADD to COLLECTIONS:
private readonly COLLECTIONS = {
  events: "events",
  knowledge: "knowledge",
  incidents: "incidents",
  faces: "faces",        // NEW: 512-d Cosine for ArcFace
} as const;

// NEW: Face-specific vector size
private readonly FACE_VECTOR_SIZE = 512;

// NEW methods to add:
async upsertFaces(points: QdrantPoint[]): Promise<void> {
  if (points.length === 0) return;
  try {
    await this.client.upsert(this.COLLECTIONS.faces, {
      wait: true,
      points: points.map((p) => ({ id: p.id, vector: p.vector, payload: p.payload })),
    });
  } catch (err: any) {
    this.logger.warn(`Qdrant upsertFaces failed: ${err.message}`);
  }
}

async searchFaces(
  queryEmbedding: number[],
  filters: { organizationId: string; limit?: number },
): Promise<QdrantSearchResult[]> {
  const must = [{ key: "organizationId", match: { value: filters.organizationId } }];
  try {
    const result = await this.client.search(this.COLLECTIONS.faces, {
      vector: queryEmbedding,
      filter: { must },
      limit: filters.limit ?? 5,
      with_payload: true,
    });
    return result.map((r) => ({ id: r.id, score: r.score, payload: (r.payload ?? {}) as Record<string, unknown> }));
  } catch (err: any) {
    this.logger.warn(`Qdrant searchFaces failed: ${err.message}`);
    return [];
  }
}
```

---

### Shared Package — `credential-types.ts` (MODIFY)

**Analog:** same file (existing) — 8 lines
```typescript
export const CREDENTIAL_TYPES = {
  BADGE: "BADGE",
  PIN: "PIN",
  MOBILE: "MOBILE",
  QR: "QR",
  FINGERPRINT: "FINGERPRINT",  // NEW
  FACE: "FACE",                // NEW
} as const;
export type CredentialType = (typeof CREDENTIAL_TYPES)[keyof typeof CREDENTIAL_TYPES];
```

---

### Shared Package — `roles.ts` (MODIFY)

**Analog:** same file (existing) — 27 lines
```typescript
export const ROLES = {
  GLOBAL_ADMIN: "GLOBAL_ADMIN",  // NEW: parent-org level
  SUPER_ADMIN: "SUPER_ADMIN",
  SITE_ADMIN: "SITE_ADMIN",      // NEW: child-site level
  ADMIN: "ADMIN",
  SUPERVISOR: "SUPERVISOR",
  OPERATOR: "OPERATOR",
  VIEWER: "VIEWER",
  AUDITOR: "AUDITOR",
} as const;

export const ROLE_HIERARCHY: Record<Role, number> = {
  GLOBAL_ADMIN: 100,   // NEW
  SUPER_ADMIN: 90,     // shifted
  SITE_ADMIN: 75,      // NEW
  ADMIN: 60,           // shifted
  SUPERVISOR: 45,      // shifted
  OPERATOR: 30,
  AUDITOR: 25,
  VIEWER: 20,
};
```

---

### Shared Package — `access.schema.ts` (MODIFY)

**Analog:** same file (existing) — 83 lines

**Extend credential schema with new types** (lines 11-20, 22-30):
```typescript
const credentialBaseSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(["BADGE", "PIN", "MOBILE", "QR", "FINGERPRINT", "FACE"]),
  badgeNumber: z.string().min(1).optional(),
  pinHash: z.string().optional(),
  qrSeed: z.string().optional(),
  fingerprintTemplateHash: z.string().optional(),  // NEW
  faceEmbeddingId: z.string().uuid().optional(),    // NEW
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  maxUses: z.number().int().positive().optional(),
});

// NEW schemas:
export const createAccessGroupSchema = z.object({
  name: z.string().min(1).max(128),
  organizationId: z.string().uuid(),
  description: z.string().optional(),
});

export const createFaceSchema = z.object({
  name: z.string().min(1).max(100),
  photoBase64: z.string().min(1),
  isBlacklisted: z.boolean().optional().default(false),
});
```

---

### Tenant Isolation Guard — (MODIFY: parent-child org)

**Analog:** same file (existing) — 40 lines

**Extended guard pattern** — add parent-org traversal:
```typescript
@Injectable()
export class TenantIsolationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,  // ADD
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.orgId) throw new ForbiddenException("No organization context");

    // NEW: Check if user has GLOBAL_ADMIN role and resource org is a child
    if (user.role === "GLOBAL_ADMIN" && request.params?.orgId) {
      const childOrg = await this.prisma.organization.findUnique({
        where: { id: request.params.orgId },
        select: { parentOrganizationId: true },
      });
      if (childOrg?.parentOrganizationId === user.orgId) {
        return true; // Global admin accessing child org
      }
    }
    return true;
  }
}
```

---

### Dashboard — `visages/page.tsx` (MODIFY: extend for blacklist + BASTION)

**Analog:** same file (existing) — 294 lines

**Existing face management UI pattern** (lines 1-293):
```typescript
'use client';
import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { PageTransition } from '@/components/page-transition';
import { GlassCard } from '@/components/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { FaceUploadDropzone } from '@/components/face-upload-dropzone';
import { toast } from '@/components/ui/toast';
import { getFaces, addFace, deleteFace, type FaceEntry } from '@/lib/api';

export default function VisagesPage() {
  const [faces, setFaces] = useState<FaceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true); setError(null);
    getFaces().then(setFaces).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [refreshKey]);

  // Loading state, error state, empty state, filtered empty, data grid

  // Upload dialog pattern
  <Dialog open={showUpload} onOpenChange={setShowUpload}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Ajouter un visage</DialogTitle>
        <DialogDescription>Téléchargez une photo...</DialogDescription>
      </DialogHeader>
      <FaceUploadDropzone onFileSelected={handleFileSelected} ... />
    </DialogContent>
  </Dialog>
}
```

---

### Dashboard — `lib/api.ts` (MODIFY: new BASTION endpoints)

**Analog:** same file (existing) — see lines 3154-3193 for face API pattern

**API client pattern**:
```typescript
export async function getFaces(): Promise<FaceEntry[]> {
  const res = await fetchWithAuth(`${API_URL}/api/faces`);
  if (!res.ok) throw new Error("Échec du chargement des visages");
  return res.json();
}

// NEW BASTION endpoints follow the same pattern:
export async function getBastionFaces(filters?: { page?: number; limit?: number }): Promise<PaginatedResponse<BastionFaceEntry>> {
  const params = new URLSearchParams();
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  const res = await fetchWithAuth(`${API_URL}/api/bastion/faces?${params}`);
  if (!res.ok) throw new Error("Échec du chargement");
  return res.json();
}

export async function enrollBastionFace(data: { name: string; photoBase64: string }): Promise<BastionFaceEntry> {
  const res = await fetchWithAuth(`${API_URL}/api/bastion/faces`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de l'ajout du visage");
  return res.json();
}
```

---

### Mobile — `acces/index.tsx` (MODIFY: new credential types)

**Analog:** same file (existing) — 296 lines

**Mobile screen pattern with tabs + FlashList** (lines 1-296):
```typescript
import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import FlashList from "@shopify/flash-list";
import { fetchCredentials, ... } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";

type Tab = "credentials" | "zones" | "schedules";
const TYPE_COLORS: Record<string, string> = {
  BADGE: "#06b6d4",
  PIN: "#a855f7",
  MOBILE: "#10b981",
  QR: "#f59e0b",
  FINGERPRINT: "#ec4899",   // NEW
  FACE: "#3b82f6",          // NEW
};

export default function AccesScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("credentials");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      setError(null);
      const [credData, zoneData, schedData] = await Promise.all([
        fetchCredentials({ limit: 50 }).catch(() => ({ data: [], total: 0 })),
        fetchAccessZones().catch(() => []),
        fetchAccessSchedules().catch(() => []),
      ]);
      setCredentials(credData.data || []);
      // ...
    } catch (e) { setError("Erreur de chargement"); }
    finally { setLoading(false); }
  }, []);

  // FlashList render pattern with pull-to-refresh
  <FlashList
    data={credentials}
    renderItem={({ item }) => (
      <TouchableOpacity style={styles.card} onLongPress={() => handleDeactivate(item)}>
        <View style={[styles.typeIndicator, { backgroundColor: TYPE_COLORS[item.type] }]} />
        <View style={styles.cardContent}>
          <Text style={styles.userName}>{item.user?.firstName} {item.user?.lastName}</Text>
        </View>
      </TouchableOpacity>
    )}
    estimatedItemSize={90}
    refreshing={refreshing}
    onRefresh={refresh}
  />
}
```

---

### Feature Gate Decorator — Guards Chain Pattern

**Analog:** `apps/api/src/common/guards/feature-gate.guard.ts` (114 lines)

**Guard chain order** (all BASTION endpoints follow this):
```
JwtAuthGuard → TenantIsolationGuard → RolesGuard → FeatureGateGuard
```

**Controller-level decorator pattern:**
```typescript
@Controller("bastion")
@RequiresPack("BASTION")              // Pack-level gate
export class BastionController {

  @Post("faces")
  @RequiresModule("advanced_facial_recognition")  // Module-level gate
  @Roles("ADMIN", "SUPER_ADMIN", "GLOBAL_ADMIN")
  @Audited({ entity: "face", action: "CREATE" })
  async enrollFace(@Body(new ZodValidationPipe(createFaceSchema)) body: any) {
    return this.bastionService.enrollFace(body);
  }
}
```

---

### Shared Package — `packages/shared/src/index.ts` (MODIFY: exports)

**Analog:** same file (existing) — 429 lines

**Export pattern — add BASTION exports** following existing style:
```typescript
// ── BASTION Pack ──
export {
  createFaceSchema,
  createAccessGroupSchema,
  updateCredentialSchema as updateBastionCredentialSchema,
} from "./schemas/access.schema";
export type {
  CreateFaceInput,
  CreateAccessGroupInput,
} from "./schemas/access.schema";

// Constants - BASTION
export { CREDENTIAL_TYPES } from "./constants/credential-types";  // already exported, types extended
export type { CredentialType } from "./constants/credential-types";
```

---

## Shared Patterns

### Authentication
**Source:** `apps/api/src/common/guards/feature-gate.guard.ts`, `apps/api/src/common/guards/tenant-isolation.guard.ts`
**Apply to:** All new BASTION and Multi-site controllers

All BASTION endpoints must be protected by guard chain:
```typescript
@Controller("bastion")
@RequiresPack("BASTION")
@UseGuards(JwtAuthGuard, TenantIsolationGuard, RolesGuard, FeatureGateGuard)
```

### Error Handling (NestJS)
**Source:** `apps/api/src/modules/access/access.service.ts`
**Apply to:** All service files

```typescript
// Guard clause pattern (lines 30-37, 44-50, 120-121)
if (dto.type === "BADGE" && dto.badgeNumber) {
  const existing = await this.prisma.credential.findUnique({ where: { badgeNumber: dto.badgeNumber } });
  if (existing) throw new BadRequestException("Badge number already in use");
}

// NotFoundException on missing resource (line 120)
if (!credential) throw new NotFoundException("Credential not found");

// Paginated response pattern (lines 91-107)
const [data, total] = await Promise.all([
  this.prisma.credential.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
  this.prisma.credential.count({ where }),
]);
return { data, total, page, limit };
```

### Audit Logging
**Source:** `apps/api/src/modules/organization/organization.controller.ts`
**Apply to:** All mutation endpoints

```typescript
// Pattern: call auditService.log() after mutation
await this.auditService.log({
  userId: (req as any).user?.id,
  action: 'CREATE',
  entity: 'face',
  entityId: result.id,
  request: req,
});
```

### Validation (Zod)
**Source:** `packages/shared/src/schemas/access.schema.ts` + `apps/api/src/common/pipes/zod-validation.pipe.ts`
**Apply to:** All controller POST/PUT handlers

```typescript
@Body(new ZodValidationPipe(createFaceSchema))
```

### AI Preprocessor Detection Pipeline
**Source:** `services/ai-preprocessor/app/routes/detection.py`
**Apply to:** All new BASTION detection routes

The BASTION detection pipeline follows the exact same structure:
1. Decode base64 frame
2. Run YOLO detection in `run_in_executor`
3. Filter detections (zone, class_id)
4. ByteTrack cross-frame tracking
5. Temporal smoothing (3-of-5 frames)
6. Notify NestJS (fire-and-forget via httpx)

### AI Preprocessor Lazy Singleton Models
**Source:** `services/ai-preprocessor/app/models/detector.py`, `models/face_recogniser.py`, `models/tracker.py`
**Apply to:** All AI model loading

```python
_model_instance = None

def get_model():
    global _model_instance
    if _model_instance is None:
        logger.info("Loading model...")
        _model_instance = ModelClass()
    return _model_instance
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/api/src/modules/bastion/face/face.service.ts` | service | CRUD + vector DB | New pattern: hybrid Prisma + Qdrant service for face enrollment. Closest analog is QdrantService (partial) + AccessService (partial), but the Qdrant→Prisma dual-write pattern is new. Use AI-SPEC §4b.1 face enrollment flow and RESEARCH.md Patterns 1-2. |
| `apps/dashboard/app/(dashboard)/sites/[id]/page.tsx` | component | request-response | Per-site drill-down dashboard with aggregate stats. No existing per-org drill-down page. Closest analog is `sites/page.tsx` for CRUD pattern, but dashboard stats/charts are new. |
| `apps/dashboard/app/(dashboard)/bastion/` | component | request-response | Entirely new BASTION config UI section. No existing feature-config pages for detection thresholds, face blacklist, etc. Base pattern on existing `visages/page.tsx` for component structure. |

---

## Metadata

**Analog search scope:**
- `services/ai-preprocessor/app/` — all routes, models, schemas, config, main.py
- `apps/api/src/modules/access/` — controller, service, module, processor, gateway
- `apps/api/src/modules/site/` — controller, service, spec
- `apps/api/src/modules/organization/` — controller, service, module
- `apps/api/src/modules/ai-agent/qdrant/` — service
- `apps/api/src/common/guards/` — tenant-isolation, feature-gate
- `apps/api/src/common/decorators/` — feature-gate, audited
- `apps/api/prisma/schema.prisma` — full schema
- `packages/shared/src/` — constants, schemas, types, index.ts barrel
- `apps/dashboard/app/(dashboard)/` — visages, sites pages
- `apps/dashboard/lib/api.ts` — face API functions
- `apps/mobile/app/(tabs)/` — acces page
- `apps/mobile/app/visages/` — face add page
- `apps/mobile/lib/api.ts` — mobile API client

**Files scanned:** 48 files across the entire codebase
**Pattern extraction date:** 2026-07-18
