import { IsDateString, IsInt, IsUUID } from "class-validator";

/** Jeden lokálně vzniklý event z fronty zařízení (viz 03-architecture.md §3.5). */
export class SyncEventDto {
  @IsUUID()
  klientEventId!: string;

  @IsInt()
  startovniCislo!: number;

  @IsDateString()
  klientCas!: string;
}
