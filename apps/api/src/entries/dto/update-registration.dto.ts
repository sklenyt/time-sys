import { IsEmail } from "class-validator";

/** PATCH /routes/:routeId/registrations/:id — oprava e-mailu čekající registrace. */
export class UpdateRegistrationDto {
  @IsEmail()
  email!: string;
}
