import { ApiError } from "./api";

/**
 * API vrací chybu jako JSON text v ApiError.message (viz lib/api.ts
 * `throw new ApiError(res.status, body)`, kde body je res.text()) — tenhle
 * helper ho rozbalí, ať uživatel vidí skutečnou příčinu (např. "odkaz
 * vypršel"), ne jen napevno daný obecný text.
 */
export function chybaZeServeru(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    try {
      const parsed = JSON.parse(e.message) as { message?: string | string[] };
      if (parsed.message) {
        return Array.isArray(parsed.message) ? parsed.message.join(", ") : parsed.message;
      }
    } catch {
      // tělo nebylo JSON — spadne na fallback níž
    }
  }
  if (e instanceof TypeError) {
    return "Nepodařilo se spojit se serverem. Zkontrolujte připojení a zkuste to znovu.";
  }
  return fallback;
}
