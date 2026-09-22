import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { Role } from "@depo/shared";
import { StartVlnyService } from "./start-vlny.service";
import { CreateStartVlnaDto } from "./dto/create-start-vlna.dto";
import { StartActionDto } from "./dto/start-action.dto";
import { PlanStartDto } from "./dto/plan-start.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { Public } from "../auth/decorators/public.decorator";

const START_ROLE = [Role.ADMIN, Role.ORGANIZATOR, Role.CASOMERIC];

@Controller("routes/:routeId")
export class StartVlnyController {
  constructor(private readonly startVlny: StartVlnyService) {}

  @Public()
  @Get("start-waves")
  findAll(@Param("routeId", ParseUUIDPipe) routeId: string) {
    return this.startVlny.findAllForRoute(routeId);
  }

  @Roles(...START_ROLE)
  @Post("start-waves")
  create(@Param("routeId", ParseUUIDPipe) routeId: string, @Body() dto: CreateStartVlnaDto) {
    return this.startVlny.create(routeId, dto);
  }

  @Roles(...START_ROLE)
  @Post("start")
  start(@Param("routeId", ParseUUIDPipe) routeId: string, @Body() dto: StartActionDto) {
    return this.startVlny.start(routeId, dto.startVlnaId);
  }

  @Roles(...START_ROLE)
  @Delete("start")
  cancel(@Param("routeId", ParseUUIDPipe) routeId: string, @Body() dto: StartActionDto) {
    return this.startVlny.cancel(routeId, dto.startVlnaId);
  }

  /** Naplánuje automatický start v daný čas (F05 rozšíření) — vlnu spustí StartAutostartService bez nutnosti otevřeného prohlížeče. */
  @Roles(...START_ROLE)
  @Post("start-plan")
  plan(@Param("routeId", ParseUUIDPipe) routeId: string, @Body() dto: PlanStartDto) {
    return this.startVlny.naplanovatStart(routeId, dto.startVlnaId, new Date(dto.planovanyStart));
  }

  @Roles(...START_ROLE)
  @Delete("start-plan")
  cancelPlan(@Param("routeId", ParseUUIDPipe) routeId: string, @Body() dto: StartActionDto) {
    return this.startVlny.zrusitPlan(routeId, dto.startVlnaId);
  }
}
