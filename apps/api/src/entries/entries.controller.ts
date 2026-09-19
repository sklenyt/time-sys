import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { EntriesService } from "./entries.service";
import { CreateEntryDto } from "./dto/create-entry.dto";
import { Public } from "../auth/decorators/public.decorator";

/** Zatím veřejné, viz poznámka v OrganizationsController. */
@Public()
@Controller("routes/:routeId/entries")
export class EntriesController {
  constructor(private readonly entries: EntriesService) {}

  @Post()
  create(@Param("routeId", ParseUUIDPipe) routeId: string, @Body() dto: CreateEntryDto) {
    return this.entries.create(routeId, dto);
  }

  @Get()
  findAll(@Param("routeId", ParseUUIDPipe) routeId: string, @Query("search") search?: string) {
    return this.entries.findAllForRoute(routeId, search);
  }
}
