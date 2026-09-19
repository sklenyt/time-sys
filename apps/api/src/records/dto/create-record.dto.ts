import { IsDateString, IsInt, IsUUID } from "class-validator";

/**
 * Jádro workflow "číslo + Enter" (F06) — čas je klientCas, okamžik
 * potvrzení na zařízení, nikdy ruční vstup.
 */
export class CreateRecordDto {
  @IsInt()
  startovniCislo!: number;

  @IsUUID()
  zarizeniId!: string;

  @IsDateString()
  klientCas!: string;

  /** UUID z klienta — idempotence při opakovaném odeslání po výpadku spojení. */
  @IsUUID()
  klientEventId!: string;
}
