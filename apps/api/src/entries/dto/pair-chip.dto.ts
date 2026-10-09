import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { TypCipu } from "@depo/shared";

/** F29 (Fáze 4) — spárování RFID čipu s existující přihláškou (nutná příprava pro F22 ingest). */
export class PairChipDto {
  @IsString()
  @IsNotEmpty()
  kodCipu!: string;

  /** Typ nového čipu, který ještě není ve skladu (výchozí opakovaný). */
  @IsOptional()
  @IsEnum(TypCipu)
  typ?: TypCipu;
}
