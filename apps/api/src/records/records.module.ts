import { Module } from "@nestjs/common";
import { RecordsController } from "./records.controller";
import { RecordsService } from "./records.service";
import { PublishTargetsModule } from "../publish-targets/publish-targets.module";
import { ResultsModule } from "../results/results.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [PublishTargetsModule, ResultsModule, NotificationsModule],
  controllers: [RecordsController],
  providers: [RecordsService],
  exports: [RecordsService],
})
export class RecordsModule {}
