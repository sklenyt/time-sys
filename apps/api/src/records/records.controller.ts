import { Body, Controller, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { RecordsService } from "./records.service";
import { CreateRecordDto } from "./dto/create-record.dto";

@Controller("routes/:routeId/records")
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Post()
  create(@Param("routeId", ParseUUIDPipe) routeId: string, @Body() dto: CreateRecordDto) {
    return this.records.create(routeId, dto);
  }
}
