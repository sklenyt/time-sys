import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { EventsModule } from "./events/events.module";
import { RoutesModule } from "./routes/routes.module";
import { CategoriesModule } from "./categories/categories.module";
import { EntriesModule } from "./entries/entries.module";
import { RecordsModule } from "./records/records.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    OrganizationsModule,
    EventsModule,
    RoutesModule,
    CategoriesModule,
    EntriesModule,
    RecordsModule,
  ],
})
export class AppModule {}
