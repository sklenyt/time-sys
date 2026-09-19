import { Module } from "@nestjs/common";
import { RecordsController } from "./records.controller";
import { RecordsService } from "./records.service";
import { PublishTargetsModule } from "../publish-targets/publish-targets.module";

@Module({
  imports: [PublishTargetsModule],
  controllers: [RecordsController],
  providers: [RecordsService],
  exports: [RecordsService],
})
export class RecordsModule {}
