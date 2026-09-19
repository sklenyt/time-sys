import { IsNotEmpty, IsString } from "class-validator";

/** F29 (Fáze 4) — spárování RFID čipu s existující přihláškou (nutná příprava pro F22 ingest). */
export class PairChipDto {
  @IsString()
  @IsNotEmpty()
  kodCipu!: string;
}
