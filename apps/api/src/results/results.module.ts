import { Module } from "@nestjs/common";
import { ResultsController, RunningController } from "./results.controller";
import { ResultsService } from "./results.service";

@Module({
  controllers: [ResultsController, RunningController],
  providers: [ResultsService],
  exports: [ResultsService],
})
export class ResultsModule {}
