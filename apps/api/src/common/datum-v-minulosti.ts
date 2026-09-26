/**
 * Datum (bez času, `@db.Date`) je striktně před dnešním dnem — použito pro
 * autodetekci "propadlé" akce/trati (datum proběhl a nic se nestalo), viz
 * events.service.ts a results.service.ts. Sdíleno, ať se srovnání "dnešní
 * půlnoc" nerozjede na dvou místech nezávisle na sobě.
 */
export function jeDatumVMinulosti(datum: Date): boolean {
  const dnesniPulnoc = new Date();
  dnesniPulnoc.setHours(0, 0, 0, 0);
  return datum.getTime() < dnesniPulnoc.getTime();
}
