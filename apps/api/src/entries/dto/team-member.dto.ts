import { IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * Jeden člen štafety/družstva — zrcadlí legacy vzor `tblStartovniListina`
 * (4× prijmeniN/jmenoN/rocnikN/klubN), viz docs/11-legacy-schema-reference.md
 * (git historie, dokument byl při rebrandu na Depo smazán). Uložené jako
 * `Prihlaska.clenoveDruzstva` (JSON) — družstvo nemá vlastní tabulku,
 * protože závodí pod jedním startovním číslem hlavního přihlášeného.
 */
export class TeamMemberDto {
  @IsString()
  @IsNotEmpty()
  prijmeni!: string;

  @IsString()
  @IsNotEmpty()
  jmeno!: string;

  @IsOptional()
  @IsInt()
  rocnik?: number;

  @IsOptional()
  @IsString()
  klub?: string;
}
