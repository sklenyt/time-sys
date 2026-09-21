import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { Role } from "@depo/shared";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { VerifyEventPasswordDto } from "./dto/verify-event-password.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { Public } from "../auth/decorators/public.decorator";

@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  create(@Body() dto: CreateEventDto, @CurrentUser() user: AuthenticatedUser) {
    return this.events.create(dto, user.organizaceId);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.events.findAllForOrganizace(user.organizaceId);
  }

  /**
   * Veřejný adresář pro vysledky.depotime.cz — musí být před ":id", jinak
   * by ho NestJS routoval jako `findOne("verejne")`.
   */
  @Public()
  @Get("verejne")
  findVerejne() {
    return this.events.najitVerejneUdalosti();
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.events.findOne(id);
  }

  /** Ověření hesla k veřejnému výpisu výsledků (vysledky.depotime.cz) — bez přihlášení. */
  @Public()
  @Post(":id/pristup")
  @HttpCode(HttpStatus.OK)
  overitPristup(@Param("id", ParseUUIDPipe) id: string, @Body() dto: VerifyEventPasswordDto) {
    return this.events.overitHesloUdalosti(id, dto.heslo);
  }

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Patch(":eventId")
  update(@Param("eventId", ParseUUIDPipe) eventId: string, @Body() dto: UpdateEventDto) {
    return this.events.update(eventId, dto);
  }

  @Roles(Role.ADMIN, Role.ORGANIZATOR)
  @Delete(":eventId")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("eventId", ParseUUIDPipe) eventId: string) {
    return this.events.remove(eventId);
  }
}
