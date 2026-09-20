import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsEnum, IsOptional, ValidateNested } from "class-validator";
import { StavUkonceni } from "@depo/shared";
import { TeamMemberDto } from "./team-member.dto";

/**
 * PATCH /routes/:routeId/entries/:entryId — ruční stav ukončení (F11,
 * UC12 v 01-analysis.md/git historii) a/nebo úprava soupisky družstva.
 * Obě pole jsou nepovinná a nezávislá, aby šlo poslat jen to, co se mění.
 */
export class UpdateEntryDto {
  @IsOptional()
  @IsEnum(StavUkonceni)
  stavUkonceni?: StavUkonceni | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  clenoveDruzstva?: TeamMemberDto[] | null;
}
