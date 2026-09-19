import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { Role } from "@depo/shared";
import { AuditLogService } from "./audit-log.service";
import { Roles } from "../auth/decorators/roles.decorator";

/** Jen ADMIN/ORGANIZATOR — auditní log je organizátorský nástroj, ne pro časoměřiče na místě. */
@Controller("routes/:routeId/audit-log")
export class AuditLogController {
  constructor(private readonly auditLog: AuditLogService) {}

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Get()
  list(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Query("uzivatelId") uzivatelId?: string,
    @Query("od") od?: string,
    @Query("do") doData?: string
  ) {
    return this.auditLog.listForRoute(routeId, { uzivatelId, od, doData });
  }
}
