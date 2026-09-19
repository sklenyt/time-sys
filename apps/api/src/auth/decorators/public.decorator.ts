import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Vyjímá endpoint z globálního JwtAuthGuard (viz auth/guards/jwt-auth.guard.ts). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
