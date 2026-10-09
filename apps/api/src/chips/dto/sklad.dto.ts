import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { StavSkladuCipu, TypCipu } from "@depo/shared";

export class PridatDoSkladuDto {
  /** Kódy čipů (sériová čísla) — jeden čip na položku. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  kody!: string[];

  @IsOptional()
  @IsEnum(TypCipu)
  typ?: TypCipu;
}

export class UpravitSkladDto {
  @IsOptional()
  @IsEnum(TypCipu)
  typ?: TypCipu;

  /** Ručně lze nastavit jen skladem, ztracen, vyřazen — „vydán“ vzniká přiřazením. */
  @IsOptional()
  @IsEnum(StavSkladuCipu)
  stav?: StavSkladuCipu;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  stitek?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  poznamka?: string;
}

export class PresunoutSkladDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @IsUUID("all", { each: true })
  ids!: string[];

  @IsUUID()
  cilOrganizaceId!: string;
}
