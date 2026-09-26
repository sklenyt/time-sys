import { IsInt } from "class-validator";

/** POST /routes/:routeId/registrations/:registrationId/prideleni — organizátor ručně přidělí startovní číslo. */
export class AssignNumberDto {
  @IsInt()
  startovniCislo!: number;
}
