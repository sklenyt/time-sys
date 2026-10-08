/**
 * Super admin: uživatel, jehož e-mail je v proměnné prostředí
 * `SUPERADMIN_EMAILS` (čárkou oddělené adresy). Vidí a spravuje akce všech
 * organizací — obchází role i izolaci organizací (RLS). Záměrně není v
 * databázi ani v kódu, nejde si ho tedy nastavit přes aplikaci.
 */
export function jeSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const povoleni = (process.env.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return povoleni.includes(email.trim().toLowerCase());
}
