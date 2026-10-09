import { Body, Controller, HttpCode, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { Public } from "../auth/decorators/public.decorator";
import { ContactService } from "./contact.service";
import { SendContactDto } from "./dto/send-contact.dto";

@Public()
@Controller("contact")
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  @HttpCode(200)
  async odeslat(@Body() dto: SendContactDto, @Req() req: Request) {
    await this.contact.odeslat(dto, req.ip ?? "neznama");
    return { ok: true };
  }
}
