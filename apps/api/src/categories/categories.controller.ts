import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { Role } from "@depo/shared";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { SuggestCategoryDto } from "./dto/suggest-category.dto";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("routes/:routeId/categories")
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Post()
  create(@Param("routeId", ParseUUIDPipe) routeId: string, @Body() dto: CreateCategoryDto) {
    return this.categories.create(routeId, dto);
  }

  @Get()
  findAll(@Param("routeId", ParseUUIDPipe) routeId: string) {
    return this.categories.findAllForRoute(routeId);
  }

  /**
   * F03 — automatický návrh kategorie podle ročníku/pohlaví (dřív existující
   * `CategoriesService.navrhniKategorii` beze všeho volajícího). Vrací
   * jen návrh k potvrzení v UI, nikdy nic neukládá.
   */
  @Get("suggest")
  suggest(@Param("routeId", ParseUUIDPipe) routeId: string, @Query() dto: SuggestCategoryDto) {
    return this.categories.navrhniKategorii(routeId, dto.rocnik, dto.pohlavi);
  }
}
