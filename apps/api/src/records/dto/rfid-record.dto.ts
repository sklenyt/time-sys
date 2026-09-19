import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { TypUdalosti } from "@depo/shared";

/**
 * F22 — ingest z Local Capture Agentu (viz docs/03-architecture.md §3.9):
 * RFID decodér zná jen kód čipu, ne startovní číslo běžce, takže se od
 * ručního zápisu (CreateRecordDto) liší jen tímhle jedním polem — po
 * překladu kódCipu → startovní číslo vzniká úplně stejný záznam.
 */
export class RfidRecordDto {
  @IsString()
  @IsNotEmpty()
  kodCipu!: string;

  @IsUUID()
  zarizeniId!: string;

  @IsDateString()
  klientCas!: string;

  @IsUUID()
  klientEventId!: string;

  @IsOptional()
  @IsIn([TypUdalosti.DOJEZD, TypUdalosti.MEZICAS])
  typUdalosti?: TypUdalosti.DOJEZD | TypUdalosti.MEZICAS;
}
