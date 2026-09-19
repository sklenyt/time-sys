import { IsNotEmpty, IsString } from "class-validator";

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  nazev!: string;
}
