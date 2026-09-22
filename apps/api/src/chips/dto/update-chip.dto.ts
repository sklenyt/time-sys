import { IsBoolean, IsEnum, IsNumber, IsOptional, Min } from "class-validator";
import { StavCipu } from "@depo/shared";

export class UpdateChipDto {
  @IsOptional()
  @IsEnum(StavCipu)
  stav?: StavCipu;

  @IsOptional()
  @IsBoolean()
  zalozni?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vratnaZaloha?: number;
}
