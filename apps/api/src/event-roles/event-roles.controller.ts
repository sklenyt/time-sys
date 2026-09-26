import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { EventRolesService } from "./event-roles.service";
import { AssignRoleDto } from "./dto/assign-role.dto";
import { InviteRoleDto } from "./dto/invite-role.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("events/:eventId/roles")
export class EventRolesController {
  constructor(private readonly eventRoles: EventRolesService) {}

  @Get()
  findAll(@Param("eventId", ParseUUIDPipe) eventId: string) {
    return this.eventRoles.findAllForEvent(eventId);
  }

  @Post()
  assign(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventRoles.assign(eventId, dto, user.id);
  }

  @Post("pozvat")
  invite(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Body() dto: InviteRoleDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventRoles.invite(eventId, dto, user.id);
  }

  @Delete(":roleId")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Param("roleId", ParseUUIDPipe) roleId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventRoles.remove(eventId, roleId, user.id);
  }
}
