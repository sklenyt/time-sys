import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import { ProtokolPublikace } from "@depo/shared";

export class CreatePublishTargetDto {
  @IsEnum(ProtokolPublikace)
  protokol!: ProtokolPublikace;

  @IsString()
  @IsNotEmpty()
  server!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  @IsString()
  @IsNotEmpty()
  cesta!: string;

  @IsString()
  @IsNotEmpty()
  uzivatel!: string;

  @IsString()
  @IsNotEmpty()
  heslo!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  intervalMinut?: number;

  @IsOptional()
  @IsBoolean()
  exportPoKazdemZaznamu?: boolean;

  @IsOptional()
  @IsString()
  htmlSablona?: string;
}
