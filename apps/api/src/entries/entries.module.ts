import { Module } from "@nestjs/common";
import { EntriesController, PublicRegistrationController, RegistrationsController } from "./entries.controller";
import { EntriesService } from "./entries.service";
import { StartVlnyModule } from "../start-vlny/start-vlny.module";
import { GdprModule } from "../gdpr/gdpr.module";
import { CategoriesModule } from "../categories/categories.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [StartVlnyModule, GdprModule, CategoriesModule, NotificationsModule],
  controllers: [EntriesController, PublicRegistrationController, RegistrationsController],
  providers: [EntriesService],
  exports: [EntriesService],
})
export class EntriesModule {}
