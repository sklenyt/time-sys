import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

/** F26 (Fáze 4) — reporty rekordů tratě a historie výkonů, scoped na vlastní organizaci volajícího. */
@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("course-records")
  courseRecords(@Query("nazev") nazev: string, @CurrentUser() user: AuthenticatedUser) {
    if (!nazev?.trim()) {
      throw new BadRequestException("Parametr nazev je povinný");
    }
    return this.reports.courseRecords(user.organizaceId, nazev.trim());
  }

  @Get("runner-history")
  runnerHistory(
    @Query("prijmeni") prijmeni: string,
    @Query("jmeno") jmeno: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    if (!prijmeni?.trim() || !jmeno?.trim()) {
      throw new BadRequestException("Parametry prijmeni a jmeno jsou povinné");
    }
    return this.reports.runnerHistory(user.organizaceId, prijmeni.trim(), jmeno.trim());
  }
}
