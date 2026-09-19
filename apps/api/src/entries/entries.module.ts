import { Module } from "@nestjs/common";
import { EntriesController } from "./entries.controller";
import { EntriesService } from "./entries.service";
import { StartVlnyModule } from "../start-vlny/start-vlny.module";
import { GdprModule } from "../gdpr/gdpr.module";

@Module({
  imports: [StartVlnyModule, GdprModule],
  controllers: [EntriesController],
  providers: [EntriesService],
  exports: [EntriesService],
})
export class EntriesModule {}
