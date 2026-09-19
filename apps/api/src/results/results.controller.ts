import { Controller, Get, Param, ParseUUIDPipe, Res } from "@nestjs/common";
import type { Response } from "express";
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

  @Get("export.xlsx")
  async exportXlsx(@Param("routeId", ParseUUIDPipe) routeId: string, @Res() res: Response) {
    const buffer = await this.results.buildResultsXlsx(routeId);
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="vysledky.xlsx"',
    });
    res.send(buffer);
  }

  @Get("export.pdf")
  async exportPdf(@Param("routeId", ParseUUIDPipe) routeId: string, @Res() res: Response) {
    const buffer = await this.results.buildResultsPdf(routeId);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="vysledky.pdf"',
    });
    res.send(buffer);
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
