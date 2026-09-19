import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { RecordsService } from "./records.service";
import { CreateRecordDto } from "./dto/create-record.dto";
import { CorrectRecordDto } from "./dto/correct-record.dto";
import { RfidRecordDto } from "./dto/rfid-record.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { Role } from "@depo/shared";

const MERI_ROLE = [Role.ADMIN, Role.ORGANIZATOR, Role.CASOMERIC, Role.STANOVISTE];

@Controller("routes/:routeId/records")
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Roles(...MERI_ROLE)
  @Post()
  create(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Body() dto: CreateRecordDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.records.create(routeId, dto, user.id);
  }

  /** F22 — ingest z Local Capture Agentu (viz docs/03-architecture.md §3.9): stejné oprávnění jako ruční zápis. */
  @Roles(...MERI_ROLE)
  @Post("rfid")
  createFromChip(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Body() dto: RfidRecordDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.records.createFromChip(routeId, dto, user.id);
  }

  @Roles(...MERI_ROLE)
  @Patch(":recordId/correct")
  correct(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Param("recordId", ParseUUIDPipe) recordId: string,
    @Body() dto: CorrectRecordDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.records.correct(routeId, recordId, dto, user.id);
  }

  @Roles(...MERI_ROLE)
  @Get("conflicts")
  conflicts(@Param("routeId", ParseUUIDPipe) routeId: string) {
    return this.records.listConflicts(routeId);
  }

  @Roles(...MERI_ROLE)
  @Patch(":recordId/resolve")
  resolve(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Param("recordId", ParseUUIDPipe) recordId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.records.resolveConflict(routeId, recordId, user.id);
  }

  /** F41 — fotodůkaz sporného doběhu, nahraný přímo z fotoaparátu zařízení (bez potřeby speciálního HW). */
  @Roles(...MERI_ROLE)
  @Post(":recordId/foto")
  @UseInterceptors(FileInterceptor("foto"))
  async uploadFoto(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Param("recordId", ParseUUIDPipe) recordId: string,
    @UploadedFile() foto?: Express.Multer.File
  ) {
    if (!foto) {
      throw new BadRequestException('Chybí soubor v poli "foto"');
    }
    return this.records.uploadPhoto(routeId, recordId, foto);
  }

  @Roles(...MERI_ROLE)
  @Get(":recordId/foto")
  async getFoto(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Param("recordId", ParseUUIDPipe) recordId: string,
    @Res() res: Response
  ) {
    const cesta = await this.records.getPhotoPath(routeId, recordId);
    res.sendFile(cesta);
  }
}
