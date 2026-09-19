import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import { ProtokolPublikace } from "@depo/shared";

export class UpdatePublishTargetDto {
  @IsOptional()
  @IsEnum(ProtokolPublikace)
  protokol?: ProtokolPublikace;

  @IsOptional()
  @IsString()
  @MinLength(1)
  server?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  cesta?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  uzivatel?: string;

  /** Volitelné — pošle se jen při změně hesla, jinak zůstává staré. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  heslo?: string;

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
