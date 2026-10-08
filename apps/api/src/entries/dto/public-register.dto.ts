import { Type } from "class-transformer";
import { ArrayMaxSize, Equals, IsArray, IsBoolean, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from "class-validator";
import { Pohlavi } from "@depo/shared";
import { TeamMemberDto } from "./team-member.dto";

/**
 * Vlastní veřejný registrační formulář (F23, Fáze 4) — na rozdíl od
 * CreateEntryDto (organizátorský zápis) si veřejnost NEVOLÍ startovní
 * číslo (přiřadí se automaticky) ani vlnu, aby nešlo zablokovat cizí
 * číslo nebo obejít pořadí přihlášek.
 */
export class PublicRegisterDto {
  @IsString()
  @IsNotEmpty()
  prijmeni!: string;

  @IsString()
  @IsNotEmpty()
  jmeno!: string;

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  rocnik!: number;

  @IsEnum(Pohlavi)
  pohlavi!: Pohlavi;

  @IsOptional()
  @IsString()
  klub?: string;

  @IsUUID()
  kategorieId!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  telefon!: string;

  @IsOptional()
  @IsString()
  nouzovyKontakt?: string;

  @IsOptional()
  @IsString()
  zdravotniPoznamka?: string;


  /** Souhlas se zpracováním osobních údajů — registrace bez něj se nepřijme. */
  @IsBoolean()
  @Equals(true, { message: "Pro registraci je nutný souhlas se zpracováním osobních údajů" })
  souhlasSeZpracovanim!: boolean;

  /** Štafeta/družstvo (max 4 členové, legacy vzor viz TeamMemberDto) — nepovinné. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  clenoveDruzstva?: TeamMemberDto[];
}
