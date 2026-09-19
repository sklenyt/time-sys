import { IsDateString, IsIn, IsInt, IsOptional, IsUUID } from "class-validator";
import { TypUdalosti } from "@depo/shared";

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

  /**
   * DOJEZD (výchozí, cíl) nebo MEZICAS (kontrolní stanoviště, F17) — stejný
   * zápis "číslo + Enter", jen jiná sémantika při výpočtu výsledků
   * (MEZICAS se do cílového času nepočítá).
   */
  @IsOptional()
  @IsIn([TypUdalosti.DOJEZD, TypUdalosti.MEZICAS])
  typUdalosti?: TypUdalosti.DOJEZD | TypUdalosti.MEZICAS;
}
