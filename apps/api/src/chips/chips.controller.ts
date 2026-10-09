import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { Role } from "@depo/shared";
import { ChipsService } from "./chips.service";
import { UpdateChipDto } from "./dto/update-chip.dto";
import { PresunoutSkladDto, PridatDoSkladuDto, UpravitSkladDto } from "./dto/sklad.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthenticatedUser, CurrentUser } from "../auth/decorators/current-user.decorator";

@Controller("routes/:routeId/chips")
export class ChipsController {
  constructor(private readonly chips: ChipsService) {}

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Get()
  findAll(@Param("routeId", ParseUUIDPipe) routeId: string) {
    return this.chips.findAllForRoute(routeId);
  }

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Get("najit")
  najit(@Param("routeId", ParseUUIDPipe) routeId: string, @Query("kod") kod: string) {
    return this.chips.najit(routeId, kod ?? "");
  }

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Get("sklad")
  sklad(@Param("routeId", ParseUUIDPipe) routeId: string) {
    return this.chips.seznamSkladu(routeId);
  }

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Post("sklad")
  pridatDoSkladu(@Param("routeId", ParseUUIDPipe) routeId: string, @Body() dto: PridatDoSkladuDto) {
    return this.chips.pridatDoSkladu(routeId, dto);
  }

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Get("sklad/cile")
  cile(@Param("routeId", ParseUUIDPipe) routeId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.chips.cileProPresun(routeId, user.superAdmin);
  }

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @HttpCode(200)
  @Post("sklad/presunout")
  presunout(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Body() dto: PresunoutSkladDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.chips.presunout(routeId, user.superAdmin, dto.ids, dto.cilOrganizaceId);
  }

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Patch("sklad/:skladId")
  upravitSklad(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Param("skladId", ParseUUIDPipe) skladId: string,
    @Body() dto: UpravitSkladDto
  ) {
    return this.chips.upravitSklad(routeId, skladId, dto);
  }

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @HttpCode(204)
  @Delete("sklad/:skladId")
  async smazat(@Param("routeId", ParseUUIDPipe) routeId: string, @Param("skladId", ParseUUIDPipe) skladId: string) {
    await this.chips.smazatZeSkladu(routeId, skladId);
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
