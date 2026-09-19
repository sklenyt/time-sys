import { Body, Controller, Get, Post } from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { Public } from "../auth/decorators/public.decorator";

/**
 * Zatím veřejné — zakládání organizace/účtu je bootstrap krok před
 * existencí jakéhokoli uživatele. RBAC je zatím vynucené jen na
 * zápisu měření (RecordsController), viz 10-roadmap.md.
 */
@Public()
@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizations.create(dto);
  }

  @Get()
  findAll() {
    return this.organizations.findAll();
  }
}
