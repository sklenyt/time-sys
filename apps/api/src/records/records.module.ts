import { Module } from "@nestjs/common";
import { RecordsController } from "./records.controller";
import { RecordsService } from "./records.service";
import { PublishTargetsModule } from "../publish-targets/publish-targets.module";
import { ResultsModule } from "../results/results.module";

@Module({
  imports: [PublishTargetsModule, ResultsModule],
  controllers: [RecordsController],
  providers: [RecordsService],
  exports: [RecordsService],
})
export class RecordsModule {}
