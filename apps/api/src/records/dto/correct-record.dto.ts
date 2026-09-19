import { IsEnum, IsInt } from "class-validator";
import { TypOpravy } from "@depo/shared";

/**
 * Oprava startovního čísla se zachováním původního času (F08) —
 * nikdy UPDATE, vždy nový řádek s typ_udalosti=OPRAVA, viz
 * 04-data-model.md §4.2.
 */
export class CorrectRecordDto {
  @IsInt()
  noveStartovniCislo!: number;

  @IsEnum(TypOpravy)
  typOpravy!: TypOpravy;
}
