import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface AuthenticatedUser {
  id: string;
  email: string;
  jmeno: string;
  organizaceId: string | null;
  poradiMenu: string[];
  /** Viz common/superadmin.ts — vidí všechny akce všech organizací. */
  superAdmin?: boolean;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
