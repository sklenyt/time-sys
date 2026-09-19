import { Module } from "@nestjs/common";
import { EventRolesController } from "./event-roles.controller";
import { EventRolesService } from "./event-roles.service";

@Module({
  controllers: [EventRolesController],
  providers: [EventRolesService],
})
export class EventRolesModule {}
