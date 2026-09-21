import { Type } from "class-transformer";
import { IsEnum, IsInt } from "class-validator";
import { Pohlavi } from "@depo/shared";

export class SuggestCategoryDto {
  @Type(() => Number)
  @IsInt()
  rocnik!: number;

  @IsEnum(Pohlavi)
  pohlavi!: Pohlavi;
}
