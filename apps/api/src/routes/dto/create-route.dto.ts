import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { TypStartu } from "@depo/shared";

export class CreateRouteDto {
  @IsString()
  @IsNotEmpty()
  nazev!: string;

  @IsOptional()
  @IsNumber()
  delkaKm?: number;

  @IsInt()
  @Min(1)
  pocetKol!: number;

  @IsEnum(TypStartu)
  typStartu!: TypStartu;
}
