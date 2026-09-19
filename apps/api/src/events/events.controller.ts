import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { Role } from "@depo/shared";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  create(@Body() dto: CreateEventDto, @CurrentUser() user: AuthenticatedUser) {
    return this.events.create(dto, user.organizaceId);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.events.findAllForOrganizace(user.organizaceId);
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.events.findOne(id);
  }

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Patch(":eventId")
  update(@Param("eventId", ParseUUIDPipe) eventId: string, @Body() dto: UpdateEventDto) {
    return this.events.update(eventId, dto);
  }

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Delete(":eventId")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("eventId", ParseUUIDPipe) eventId: string) {
    return this.events.remove(eventId);
  }
}
