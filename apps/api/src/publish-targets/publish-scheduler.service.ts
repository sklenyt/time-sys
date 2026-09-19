import { Injectable } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { PublishTargetsService } from "./publish-targets.service";

/** Kontroluje jednou za minutu, kterým publikačním cílům uplynul `interval_minut` (F35). */
@Injectable()
export class PublishSchedulerService {
  constructor(private readonly publishTargets: PublishTargetsService) {}

  @Interval(60_000)
  async zkontrolujCile() {
    await this.publishTargets.exportPodleIntervalu();
  }
}
