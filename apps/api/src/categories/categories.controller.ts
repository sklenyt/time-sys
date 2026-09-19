import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";

@Controller("routes/:routeId/categories")
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  create(@Param("routeId", ParseUUIDPipe) routeId: string, @Body() dto: CreateCategoryDto) {
    return this.categories.create(routeId, dto);
  }

  @Get()
  findAll(@Param("routeId", ParseUUIDPipe) routeId: string) {
    return this.categories.findAllForRoute(routeId);
  }
}
