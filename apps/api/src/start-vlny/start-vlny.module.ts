import { Module } from "@nestjs/common";
import { StartVlnyController } from "./start-vlny.controller";
import { StartVlnyService } from "./start-vlny.service";
import { StartAutostartService } from "./start-autostart.service";

@Module({
  controllers: [StartVlnyController],
  providers: [StartVlnyService, StartAutostartService],
  exports: [StartVlnyService],
})
export class StartVlnyModule {}
