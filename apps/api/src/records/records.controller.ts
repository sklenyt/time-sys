import { Body, Controller, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { RecordsService } from "./records.service";
import { CreateRecordDto } from "./dto/create-record.dto";
import { CorrectRecordDto } from "./dto/correct-record.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { Role } from "@depo/shared";

const MERI_ROLE = [Role.ADMIN, Role.ORGANIZATOR, Role.CASOMERIC, Role.STANOVISTE];

@Controller("routes/:routeId/records")
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Roles(...MERI_ROLE)
  @Post()
  create(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Body() dto: CreateRecordDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.records.create(routeId, dto, user.id);
  }

  @Roles(...MERI_ROLE)
  @Patch(":recordId/correct")
  correct(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Param("recordId", ParseUUIDPipe) recordId: string,
    @Body() dto: CorrectRecordDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.records.correct(routeId, recordId, dto, user.id);
  }
}
