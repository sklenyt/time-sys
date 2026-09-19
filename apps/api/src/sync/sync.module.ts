import { Module } from "@nestjs/common";
import { SyncController } from "./sync.controller";
import { SyncService } from "./sync.service";
import { RecordsModule } from "../records/records.module";

@Module({
  imports: [RecordsModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
