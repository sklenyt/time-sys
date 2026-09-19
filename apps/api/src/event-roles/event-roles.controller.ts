import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { EventRolesService } from "./event-roles.service";
import { AssignRoleDto } from "./dto/assign-role.dto";
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
}
