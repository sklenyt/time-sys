import { Module } from "@nestjs/common";
import { ResultsController, RunningController } from "./results.controller";
import { ResultsService } from "./results.service";
import { ResultsEventsService } from "./results-events.service";

@Module({
  controllers: [ResultsController, RunningController],
  providers: [ResultsService, ResultsEventsService],
  exports: [ResultsService, ResultsEventsService],
})
export class ResultsModule {}
