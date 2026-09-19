import { SetMetadata } from "@nestjs/common";
import { Role } from "@depo/shared";

export const ROLES_KEY = "roles";

/** Role s přístupem na konkrétní událost (uzivatel_role.udalost_id) — viz RolesGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
