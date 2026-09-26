import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsOptional, ValidateNested } from "class-validator";
import { StavUkonceni } from "@depo/shared";
import { TeamMemberDto } from "./team-member.dto";

/**
 * PATCH /routes/:routeId/entries/:entryId — ruční stav ukončení (F11,
 * UC12 v 01-analysis.md/git historii), zaplaceno a/nebo úprava soupisky
 * družstva. Všechna pole jsou nepovinná a nezávislá, aby šlo poslat jen to,
 * co se mění.
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

  /** Ruční kontrola zaplacení startovného (chat 2026-09-26) — appka sama žádnou platbu nesleduje/nezpracovává. */
  @IsOptional()
  @IsBoolean()
  zaplaceno?: boolean;
}
