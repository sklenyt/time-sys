import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ResultsService } from "./results.service";
import { Public } from "../auth/decorators/public.decorator";

/** Veřejné bez přihlášení (F16 — živá stránka výsledků). */
@Public()
@Controller("routes/:routeId/results")
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  @Get()
  get(@Param("routeId", ParseUUIDPipe) routeId: string) {
    return this.results.getResults(routeId);
  }
}

/** Provozní přehled pro obsluhu, ne veřejná stránka jako výsledky (F10, UC10) — vyžaduje přihlášení. */
@Controller("routes/:routeId/running")
export class RunningController {
  constructor(private readonly results: ResultsService) {}

  @Get()
  get(@Param("routeId", ParseUUIDPipe) routeId: string) {
    return this.results.getRunning(routeId);
  }
}
