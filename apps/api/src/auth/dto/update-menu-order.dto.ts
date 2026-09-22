import { ArrayMaxSize, IsArray, IsString } from "class-validator";

/**
 * Vlastní pořadí položek postranního menu (přetahování v UI) — validace je
 * záměrně volná (jen pole řetězců), skutečné klíče položek menu (NavKey)
 * žijí ve frontendu a mění se s verzemi appky. Server je jen ukládá.
 */
export class UpdateMenuOrderDto {
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  poradiMenu!: string[];
}
