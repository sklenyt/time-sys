import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { Role } from "@depo/shared";
import { RoutesService } from "./routes.service";
import { CreateRouteDto } from "./dto/create-route.dto";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller()
export class RoutesController {
  constructor(private readonly routes: RoutesService) {}

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Post("events/:eventId/routes")
  create(@Param("eventId", ParseUUIDPipe) eventId: string, @Body() dto: CreateRouteDto) {
    return this.routes.create(eventId, dto);
  }

  @Get("events/:eventId/routes")
  findAllForEvent(@Param("eventId", ParseUUIDPipe) eventId: string) {
    return this.routes.findAllForEvent(eventId);
  }

  @Get("routes/:id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.routes.findOne(id);
  }
}
