import { Module } from "@nestjs/common";
import { StartVlnyController } from "./start-vlny.controller";
import { StartVlnyService } from "./start-vlny.service";

@Module({
  controllers: [StartVlnyController],
  providers: [StartVlnyService],
  exports: [StartVlnyService],
})
export class StartVlnyModule {}
