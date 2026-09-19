import { IsDateString, IsOptional, IsString, IsUrl, MinLength } from "class-validator";

/** organizaceId zde záměrně chybí — přesun události mezi organizacemi není podporovaná operace. */
export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nazev?: string;

  @IsOptional()
  @IsDateString()
  datum?: string;

  @IsOptional()
  @IsString()
  htmlHlavicka?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}
