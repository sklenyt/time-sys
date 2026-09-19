import { Module } from "@nestjs/common";
import { EventPublishTargetsController, PublishTargetsController } from "./publish-targets.controller";
import { PublishTargetsService } from "./publish-targets.service";
import { PublishSchedulerService } from "./publish-scheduler.service";
import { ResultsModule } from "../results/results.module";

@Module({
  imports: [ResultsModule],
  controllers: [EventPublishTargetsController, PublishTargetsController],
  providers: [PublishTargetsService, PublishSchedulerService],
  exports: [PublishTargetsService],
})
export class PublishTargetsModule {}
