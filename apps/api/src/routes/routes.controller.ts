import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { RoutesService } from "./routes.service";
import { CreateRouteDto } from "./dto/create-route.dto";

@Controller()
export class RoutesController {
  constructor(private readonly routes: RoutesService) {}

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
