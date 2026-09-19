import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Pohlavi } from "@depo/shared";

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  kod!: string;

  @IsString()
  @IsNotEmpty()
  nazev!: string;

  @IsEnum(Pohlavi)
  pohlavi!: Pohlavi;

  @IsOptional()
  @IsInt()
  rocnikOd?: number;

  @IsOptional()
  @IsInt()
  rocnikDo?: number;
}
