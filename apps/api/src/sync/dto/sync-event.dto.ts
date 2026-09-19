import { IsDateString, IsIn, IsInt, IsOptional, IsUUID } from "class-validator";
import { TypUdalosti } from "@depo/shared";

/** Jeden lokálně vzniklý event z fronty zařízení (viz 03-architecture.md §3.5). */
export class SyncEventDto {
  @IsUUID()
  klientEventId!: string;

  @IsInt()
  startovniCislo!: number;

  @IsDateString()
  klientCas!: string;

  /** DOJEZD (výchozí) nebo MEZICAS na kontrolním stanovišti (F17). */
  @IsOptional()
  @IsIn([TypUdalosti.DOJEZD, TypUdalosti.MEZICAS])
  typUdalosti?: TypUdalosti.DOJEZD | TypUdalosti.MEZICAS;
}
