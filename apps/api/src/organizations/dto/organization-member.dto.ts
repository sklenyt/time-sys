import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class AddOrganizationMemberDto {
  /** E-mail existujícího účtu. */
  @IsEmail()
  email!: string;
}

export class RenameOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nazev!: string;
}
