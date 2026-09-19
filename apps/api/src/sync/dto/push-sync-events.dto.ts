import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsUUID, ValidateNested } from "class-validator";
import { SyncEventDto } from "./sync-event.dto";

/** POST /routes/:routeId/sync/events — dávkové odeslání fronty z jednoho zařízení. */
export class PushSyncEventsDto {
  @IsUUID()
  zarizeniId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SyncEventDto)
  events!: SyncEventDto[];
}
