import { IsEnum, IsUUID } from "class-validator";
import { Role } from "@depo/shared";

export class AssignRoleDto {
  @IsUUID()
  uzivatelId!: string;

  @IsEnum(Role)
  role!: Role;
}
