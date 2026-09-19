import { Module } from "@nestjs/common";
import { GdprService } from "./gdpr.service";

@Module({
  providers: [GdprService],
  exports: [GdprService],
})
export class GdprModule {}
