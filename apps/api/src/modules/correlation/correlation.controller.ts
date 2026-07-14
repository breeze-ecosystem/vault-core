import { Controller, Get, Query, Param } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { CorrelationService } from "./correlation.service";

/**
 * CorrelationController — REST endpoints for the unified timeline.
 * VEC-02: Unified timeline display
 * VEC-03: Event video correlation
 * VEC-04: Real-time event stream connection info
 * VEC-05: Searchable event history
 */
@Controller("api/timeline")
export class CorrelationController {
  constructor(private readonly correlationService: CorrelationService) {}

  /**
   * VEC-02: Get unified timeline (merged access events + door state changes).
   * D-15: Read-time merge of TimescaleDB hypertables.
   */
  @Get("events")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR", "VIEWER")
  async getTimeline(
    @Query("siteId") siteId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("limit") limit?: string,
  ) {
    if (!siteId) {
      return { data: [], total: 0 };
    }

    const entries = await this.correlationService.getUnifiedTimeline(siteId, {
      from,
      to,
      limit: limit ? parseInt(limit, 10) : 100,
    });

    return { data: entries };
  }

  /**
   * VEC-05: Search events by multiple filters.
   */
  @Get("search")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async searchEvents(
    @Query("siteId") siteId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("credentialId") credentialId?: string,
    @Query("userId") userId?: string,
    @Query("doorId") doorId?: string,
    @Query("zoneId") zoneId?: string,
    @Query("decision") decision?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    if (!siteId) {
      return { data: [], total: 0, page: 1, limit: 20 };
    }

    return this.correlationService.searchEvents({
      siteId,
      from,
      to,
      credentialId,
      userId,
      doorId,
      zoneId,
      decision: decision as "granted" | "denied" | undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * VEC-03: Get video correlation data for a specific event.
   * Returns camera ID, snapshot URL, and event timestamp for video playback.
   */
  @Get("events/:eventId/video")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR", "VIEWER")
  async getEventVideo(@Param("eventId") eventId: string) {
    return this.correlationService.getEventVideo(eventId);
  }

  /**
   * VEC-04: Return WebSocket stream connection info for real-time event streaming.
   */
  @Get("stream")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR", "VIEWER")
  async getStreamInfo() {
    return {
      namespace: "/ws/access",
      events: ["access.granted", "access.denied", "correlation.ready"],
      description:
        "Connect to this Socket.IO namespace to receive real-time access events. Subscribe to site-specific rooms via 'subscribe:site' event.",
    };
  }
}
