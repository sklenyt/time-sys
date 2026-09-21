import { Module } from "@nestjs/common";
import { EntriesController, PublicRegistrationController } from "./entries.controller";
import { EntriesService } from "./entries.service";
import { StartVlnyModule } from "../start-vlny/start-vlny.module";
import { GdprModule } from "../gdpr/gdpr.module";
import { CategoriesModule } from "../categories/categories.module";

@Module({
  imports: [StartVlnyModule, GdprModule, CategoriesModule],
  controllers: [EntriesController, PublicRegistrationController],
  providers: [EntriesService],
  exports: [EntriesService],
})
export class EntriesModule {}
