import { Controller, Get, MessageEvent, Param, ParseUUIDPipe, Res, Sse } from "@nestjs/common";
import type { Response } from "express";
import { Observable, from, merge, of } from "rxjs";
import { debounceTime, map, switchMap } from "rxjs/operators";
import { ResultsService } from "./results.service";
import { ResultsEventsService } from "./results-events.service";
import { Public } from "../auth/decorators/public.decorator";

/** Veřejné bez přihlášení (F16 — živá stránka výsledků). */
@Public()
@Controller("routes/:routeId/results")
export class ResultsController {
  constructor(
    private readonly results: ResultsService,
    private readonly events: ResultsEventsService
  ) {}

  @Get()
  get(@Param("routeId", ParseUUIDPipe) routeId: string) {
    return this.results.getResults(routeId);
  }

  /**
   * Živé výsledky přes Server-Sent Events (F16, 03-architecture.md §3.6).
   * Pošle aktuální stav hned při připojení a znovu po každé změně
   * (nový doběh/oprava) — realtime vrstva je doplněk, klient bez SSE
   * dostane stejná data přes GET výše.
   */
  @Sse("live")
  live(@Param("routeId", ParseUUIDPipe) routeId: string): Observable<MessageEvent> {
    return merge(of(null), this.events.sledovatZmeny(routeId).pipe(debounceTime(300))).pipe(
      switchMap(() => from(this.results.getResults(routeId))),
      map((data) => ({ data }))
    );
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
