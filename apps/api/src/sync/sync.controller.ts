import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { Role } from "@depo/shared";
import { SyncService } from "./sync.service";
import { PushSyncEventsDto } from "./dto/push-sync-events.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

const MERI_ROLE = [Role.ADMIN, Role.ORGANIZATOR, Role.CASOMERIC, Role.STANOVISTE];

/**
 * Offline synchronizace (F15) — nested pod /routes/:routeId, ne plochá
 * /sync/events z 06-api-design.md, aby stejná RolesGuard logika fungovala
 * jako u ostatních endpointů (RBAC podle trasy → události).
 */
@Roles(...MERI_ROLE)
@Controller("routes/:routeId/sync/events")
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post()
  push(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Body() dto: PushSyncEventsDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.sync.pushEvents(routeId, dto, user.id);
  }

  @Get()
  pull(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Query("zarizeniId", ParseUUIDPipe) zarizeniId: string,
    @Query("since") since?: string
  ) {
    return this.sync.pullEvents(routeId, zarizeniId, since);
  }
}
