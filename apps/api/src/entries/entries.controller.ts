import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { Role } from "@depo/shared";
import { EntriesService } from "./entries.service";
import { CreateEntryDto } from "./dto/create-entry.dto";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("routes/:routeId/entries")
export class EntriesController {
  constructor(private readonly entries: EntriesService) {}

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Post()
  create(@Param("routeId", ParseUUIDPipe) routeId: string, @Body() dto: CreateEntryDto) {
    return this.entries.create(routeId, dto);
  }

  @Get()
  findAll(@Param("routeId", ParseUUIDPipe) routeId: string, @Query("search") search?: string) {
    return this.entries.findAllForRoute(routeId, search);
  }
}
