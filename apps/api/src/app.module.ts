import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { EventsModule } from "./events/events.module";
import { RoutesModule } from "./routes/routes.module";
import { CategoriesModule } from "./categories/categories.module";
import { EntriesModule } from "./entries/entries.module";
import { ChipsModule } from "./chips/chips.module";
import { RecordsModule } from "./records/records.module";
import { EventRolesModule } from "./event-roles/event-roles.module";
import { ResultsModule } from "./results/results.module";
import { StartVlnyModule } from "./start-vlny/start-vlny.module";
import { PublishTargetsModule } from "./publish-targets/publish-targets.module";
import { SyncModule } from "./sync/sync.module";
import { AuditLogModule } from "./audit-log/audit-log.module";
import { ReportsModule } from "./reports/reports.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { RolesGuard } from "./auth/guards/roles.guard";
import { TenantContextInterceptor } from "./auth/interceptors/tenant-context.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    OrganizationsModule,
    EventsModule,
    RoutesModule,
    CategoriesModule,
    EntriesModule,
    ChipsModule,
    RecordsModule,
    EventRolesModule,
    ResultsModule,
    StartVlnyModule,
    PublishTargetsModule,
    SyncModule,
    AuditLogModule,
    ReportsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class AppModule {}
