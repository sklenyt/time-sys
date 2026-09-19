import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

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
}
