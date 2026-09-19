import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";
import { TypStartu } from "@depo/shared";

export class UpdateRouteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nazev?: string;

  @IsOptional()
  @IsNumber()
  delkaKm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pocetKol?: number;

  @IsOptional()
  @IsEnum(TypStartu)
  typStartu?: TypStartu;

  @IsOptional()
  @IsBoolean()
  dokoncena?: boolean;
}
