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
