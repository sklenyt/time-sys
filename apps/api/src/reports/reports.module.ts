import { Module } from "@nestjs/common";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { ResultsModule } from "../results/results.module";

@Module({
  imports: [ResultsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
