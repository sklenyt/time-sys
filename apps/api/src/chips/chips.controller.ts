import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from "@nestjs/common";
import { Role } from "@depo/shared";
import { ChipsService } from "./chips.service";
import { UpdateChipDto } from "./dto/update-chip.dto";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("routes/:routeId/chips")
export class ChipsController {
  constructor(private readonly chips: ChipsService) {}

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Get()
  findAll(@Param("routeId", ParseUUIDPipe) routeId: string) {
    return this.chips.findAllForRoute(routeId);
  }

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Patch(":cipId")
  update(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Param("cipId", ParseUUIDPipe) cipId: string,
    @Body() dto: UpdateChipDto
  ) {
    return this.chips.update(routeId, cipId, dto);
  }
}
