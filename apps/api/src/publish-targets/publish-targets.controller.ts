import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { Role } from "@depo/shared";
import { PublishTargetsService } from "./publish-targets.service";
import { CreatePublishTargetDto } from "./dto/create-publish-target.dto";
import { UpdatePublishTargetDto } from "./dto/update-publish-target.dto";
import { Roles } from "../auth/decorators/roles.decorator";

const PUBLISH_ROLE = [Role.ADMIN, Role.ORGANIZATOR];

@Controller("events/:eventId/publish-targets")
export class EventPublishTargetsController {
  constructor(private readonly publishTargets: PublishTargetsService) {}

  @Roles(...PUBLISH_ROLE)
  @Post()
  create(@Param("eventId", ParseUUIDPipe) eventId: string, @Body() dto: CreatePublishTargetDto) {
    return this.publishTargets.create(eventId, dto);
  }

  @Roles(...PUBLISH_ROLE)
  @Get()
  findAll(@Param("eventId", ParseUUIDPipe) eventId: string) {
    return this.publishTargets.findAllForEvent(eventId);
  }
}

@Controller("publish-targets/:cilId")
export class PublishTargetsController {
  constructor(private readonly publishTargets: PublishTargetsService) {}

  @Roles(...PUBLISH_ROLE)
  @Patch()
  update(@Param("cilId", ParseUUIDPipe) cilId: string, @Body() dto: UpdatePublishTargetDto) {
    return this.publishTargets.update(cilId, dto);
  }

  @Roles(...PUBLISH_ROLE)
  @Post("test")
  test(@Param("cilId", ParseUUIDPipe) cilId: string) {
    return this.publishTargets.testConnection(cilId);
  }

  @Roles(...PUBLISH_ROLE)
  @Post("export-now")
  exportNow(@Param("cilId", ParseUUIDPipe) cilId: string) {
    return this.publishTargets.exportNow(cilId);
  }

  @Roles(...PUBLISH_ROLE)
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("cilId", ParseUUIDPipe) cilId: string) {
    return this.publishTargets.remove(cilId);
  }
}
