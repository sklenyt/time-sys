import type { SyncPullResponseDto, SyncPushResponseDto } from "@depo/shared";
import { api } from "./api";

/**
 * Lokální fronta zápisů měření (F15, 03-architecture.md §3.5) — klient
 * ukládá zápis do IndexedDB okamžitě a nikdy nečeká na síť; odeslání na
 * server přes /sync/events běží na pozadí a opakuje se, dokud se
 * nepodaří.
 */

const DB_NAZEV = "depo-offline";
const DB_VERZE = 1;
const STORE = "fronta";

export type FrontaStav = "CEKA" | "OK" | "NEEDS_REVIEW" | "CIZI";

export interface FrontaZaznam {
  localKey: string;
  /** Jen u vlastních zápisů — potřebné pro odeslání a idempotenci. */
  klientEventId?: string;
  serverId?: string;
  trasaId: string;
  startovniCislo: number;
  klientCas: string;
  stav: FrontaStav;
  prihlaskaId?: string | null;
  casCelkem?: string | null;
  puvod: "VLASTNI" | "CIZI";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAZEV, DB_VERZE);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "localKey" });
        store.createIndex("by_trasa", "trasaId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function put(zaznam: FrontaZaznam): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(zaznam);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllByTrasa(trasaId: string): Promise<FrontaZaznam[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const index = tx.objectStore(STORE).index("by_trasa");
    const req = index.getAll(IDBKeyRange.only(trasaId));
    req.onsuccess = () => resolve(req.result as FrontaZaznam[]);
    req.onerror = () => reject(req.error);
  });
}

function cursorKey(trasaId: string) {
  return `depo_sync_cursor_${trasaId}`;
}

function getCursor(trasaId: string): string {
  try {
    return localStorage.getItem(cursorKey(trasaId)) ?? new Date(0).toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}

function setCursor(trasaId: string, cursor: string) {
  try {
    localStorage.setItem(cursorKey(trasaId), cursor);
  } catch {
    // soukromé prohlížení / zaplněné úložiště — kurzor se příště pošle znovu od začátku, jen redundantní pull
  }
}

/** Zapíše nový zápis do lokální fronty. Nikdy nečeká na síť (§3.5 bod 2). */
export async function enqueueZaznam(trasaId: string, startovniCislo: number): Promise<FrontaZaznam> {
  const id = crypto.randomUUID();
  const zaznam: FrontaZaznam = {
    localKey: `own:${id}`,
    klientEventId: id,
    trasaId,
    startovniCislo,
    klientCas: new Date().toISOString(),
    stav: "CEKA",
    puvod: "VLASTNI",
  };
  await put(zaznam);
  return zaznam;
}

export async function listRecent(trasaId: string, limit = 8): Promise<FrontaZaznam[]> {
  try {
    const all = await getAllByTrasa(trasaId);
    return all
      .sort((a, b) => new Date(b.klientCas).getTime() - new Date(a.klientCas).getTime())
      .slice(0, limit);
  } catch {
    return [];
  }
}

/** Odešle čekající vlastní zápisy dávkově. Chyba/výpadek sítě nechá zápisy ve frontě k dalšímu pokusu. */
export async function flushFrontu(trasaId: string, zarizeniId: string): Promise<void> {
  let cekajici: FrontaZaznam[];
  try {
    cekajici = (await getAllByTrasa(trasaId)).filter((z) => z.puvod === "VLASTNI" && z.stav === "CEKA");
  } catch {
    return;
  }
  if (cekajici.length === 0) return;

  try {
    const res = await api.post<SyncPushResponseDto>(`/routes/${trasaId}/sync/events`, {
      zarizeniId,
      events: cekajici.map((z) => ({
        klientEventId: z.klientEventId,
        startovniCislo: z.startovniCislo,
        klientCas: z.klientCas,
      })),
    });
    for (const vysledek of res.vysledky) {
      const puvodni = cekajici.find((z) => z.klientEventId === vysledek.klientEventId);
      if (!puvodni) continue;
      if (vysledek.stav === "CHYBA") continue; // zůstává CEKA, zkusí se znovu
      await put({
        ...puvodni,
        stav: vysledek.stav,
        serverId: vysledek.zaznam?.id,
        prihlaskaId: vysledek.zaznam?.prihlaskaId ?? null,
        casCelkem: vysledek.zaznam?.casCelkem ?? null,
      });
    }
  } catch {
    // offline nebo server nedostupný — fronta zůstává, další tick to zopakuje
  }
}

/** Stáhne eventy od jiných zařízení na téže trati, které tohle zařízení ještě nemá. */
export async function pullCizi(trasaId: string, zarizeniId: string): Promise<void> {
  const since = getCursor(trasaId);
  try {
    const res = await api.get<SyncPullResponseDto>(
      `/routes/${trasaId}/sync/events?zarizeniId=${zarizeniId}&since=${encodeURIComponent(since)}`
    );
    for (const z of res.eventy) {
      await put({
        localKey: `foreign:${z.id}`,
        serverId: z.id,
        trasaId,
        startovniCislo: z.startovniCisloRaw ?? 0,
        klientCas: z.cas,
        stav: z.stav === "NEEDS_REVIEW" ? "NEEDS_REVIEW" : "CIZI",
        prihlaskaId: z.prihlaskaId,
        casCelkem: z.casCelkem,
        puvod: "CIZI",
      });
    }
    setCursor(trasaId, res.cursor);
  } catch {
    // offline — zkusí se při dalším ticku
  }
}

/**
 * Spustí periodickou synchronizaci (flush + pull) a reaguje na obnovení
 * připojení. Vrací úklidovou funkci pro odregistraci při unmountu.
 */
export function startAutoSync(trasaId: string, zarizeniId: string, onZmena: () => void): () => void {
  let zruseno = false;

  const tick = async () => {
    if (zruseno) return;
    await flushFrontu(trasaId, zarizeniId);
    if (zruseno) return;
    await pullCizi(trasaId, zarizeniId);
    if (!zruseno) onZmena();
  };

  void tick();
  const interval = setInterval(tick, 5000);
  window.addEventListener("online", tick);

  return () => {
    zruseno = true;
    clearInterval(interval);
    window.removeEventListener("online", tick);
  };
}
