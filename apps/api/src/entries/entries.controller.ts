import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import type { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { Role } from "@depo/shared";
import { EntriesService } from "./entries.service";
import { CreateEntryDto } from "./dto/create-entry.dto";
import { UpdateEntryDto } from "./dto/update-entry.dto";
import { PublicRegisterDto } from "./dto/public-register.dto";
import { PairChipDto } from "./dto/pair-chip.dto";
import { AssignNumberDto } from "./dto/assign-number.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { GdprService } from "../gdpr/gdpr.service";

@Controller("routes/:routeId/entries")
export class EntriesController {
  constructor(
    private readonly entries: EntriesService,
    private readonly gdpr: GdprService
  ) {}

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

  /** F11 — ruční DNS/DNF/DQ (UC12) a/nebo úprava soupisky družstva; organizátorská akce nad startovní listinou. */
  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Patch(":entryId")
  update(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Param("entryId", ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateEntryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.entries.update(routeId, entryId, dto, user.id);
  }

  /**
   * Právo na výmaz (GDPR, docs/08-security.md §8.7) — přihláška se smaže
   * celá, ale `zaznam_udalosti` zůstává (jen se odpojí `prihlaska_id`),
   * aby výsledky a audit log neztratily integritu.
   */
  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Delete(":entryId")
  @HttpCode(HttpStatus.NO_CONTENT)
  anonymize(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Param("entryId", ParseUUIDPipe) entryId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.gdpr.anonymizovatPrihlasku(routeId, entryId, user.id);
  }

  /** F29 (Fáze 4) — spárování RFID čipu s přihláškou, příprava pro F22 ingest. */
  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Post(":entryId/chip")
  pairChip(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Param("entryId", ParseUUIDPipe) entryId: string,
    @Body() dto: PairChipDto
  ) {
    return this.entries.pairChip(routeId, entryId, dto.kodCipu);
  }

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Delete(":entryId/chip")
  @HttpCode(HttpStatus.NO_CONTENT)
  unpairChip(@Param("routeId", ParseUUIDPipe) routeId: string, @Param("entryId", ParseUUIDPipe) entryId: string) {
    return this.entries.unpairChip(routeId, entryId);
  }

  /** Export celé startovní listiny (F30, chat 2026-09-26) — na rozdíl od F20 veřejného exportu obsahuje i kontakty. */
  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Get("export.xlsx")
  async exportXlsx(@Param("routeId", ParseUUIDPipe) routeId: string, @Res() res: Response) {
    const buffer = await this.entries.buildEntriesXlsx(routeId);
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="startovni-listina.xlsx"',
    });
    res.send(buffer);
  }
}

/**
 * Čekající registrace (F30, chat 2026-09-26) — organizátor je vidí a
 * ručně přidělí startovní číslo, případně zamítne. Odděleno od
 * EntriesController, protože `Registrace` ještě není platná přihláška.
 */
@Controller("routes/:routeId/registrations")
export class RegistrationsController {
  constructor(private readonly entries: EntriesService) {}

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Get()
  findAll(@Param("routeId", ParseUUIDPipe) routeId: string) {
    return this.entries.findRegistrationsForRoute(routeId);
  }

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Post(":registrationId/prideleni")
  assignNumber(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Param("registrationId", ParseUUIDPipe) registrationId: string,
    @Body() dto: AssignNumberDto
  ) {
    return this.entries.prideliCislo(routeId, registrationId, dto);
  }

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Delete(":registrationId")
  @HttpCode(HttpStatus.NO_CONTENT)
  reject(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @Param("registrationId", ParseUUIDPipe) registrationId: string
  ) {
    return this.entries.zamitniRegistraci(routeId, registrationId);
  }
}

/**
 * Vlastní veřejný registrační formulář (F23, Fáze 4) — veřejné bez
 * přihlášení, samostatná trust-hranice od organizátorského
 * EntriesController výše (žádné startovní číslo/vlna z uživatelského vstupu).
 */
@Public()
@Controller("routes/:routeId/register")
export class PublicRegistrationController {
  constructor(private readonly entries: EntriesService) {}

  @Get()
  info(@Param("routeId", ParseUUIDPipe) routeId: string) {
    return this.entries.getRegistrationInfo(routeId);
  }

  @Post()
  register(@Param("routeId", ParseUUIDPipe) routeId: string, @Body() dto: PublicRegisterDto) {
    return this.entries.registerPublic(routeId, dto);
  }
}
