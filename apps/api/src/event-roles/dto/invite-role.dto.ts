import { IsEmail, IsEnum } from "class-validator";
import { Role } from "@depo/shared";

/** POST /events/:eventId/roles/invite — pozvání kolegy k akci podle e-mailu (chat 2026-09-26). */
export class InviteRoleDto {
  @IsEmail()
  email!: string;

  @IsEnum(Role)
  role!: Role;
}
