import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Role } from "@depo/shared";
import { EntriesService } from "./entries.service";
import { CreateEntryDto } from "./dto/create-entry.dto";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("routes/:routeId/entries")
export class EntriesController {
  constructor(private readonly entries: EntriesService) {}

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Post()
  create(@Param("routeId", ParseUUIDPipe) routeId: string, @Body() dto: CreateEntryDto) {
    return this.entries.create(routeId, dto);
  }

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Post("import")
  @UseInterceptors(FileInterceptor("soubor"))
  importCsv(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @UploadedFile() soubor?: Express.Multer.File
  ) {
    if (!soubor) {
      throw new BadRequestException('Chybí soubor v poli "soubor"');
    }
    return this.entries.importCsv(routeId, soubor.buffer);
  }

  @Get()
  findAll(@Param("routeId", ParseUUIDPipe) routeId: string, @Query("search") search?: string) {
    return this.entries.findAllForRoute(routeId, search);
  }
}
