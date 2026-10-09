import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { AddOrganizationMemberDto, RenameOrganizationDto } from "./dto/organization-member.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.organizations.create(dto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.organizations.findAllForUser(user);
  }

  @Get("prehled")
  prehled(@CurrentUser() user: AuthenticatedUser) {
    return this.organizations.prehled(user);
  }

  @Patch(":id")
  prejmenovat(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RenameOrganizationDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.organizations.prejmenovat(user, id, dto.nazev);
  }

  @HttpCode(200)
  @Post(":id/clenove")
  pridatClena(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AddOrganizationMemberDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.organizations.pridatClena(user, id, dto.email);
  }

  @Delete(":id/clenove/:uzivatelId")
  odebratClena(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("uzivatelId", ParseUUIDPipe) uzivatelId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.organizations.odebratClena(user, id, uzivatelId);
  }
}
