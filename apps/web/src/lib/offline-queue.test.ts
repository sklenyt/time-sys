import { beforeEach, describe, expect, it, vi } from "vitest";
import { TypUdalosti } from "@depo/shared";
import { api } from "./api";
import { enqueueZaznam, flushFrontu, listRecent, pullCizi } from "./offline-queue";

vi.mock("./api", () => ({
  api: { post: vi.fn(), get: vi.fn() },
}));

const mockedApi = vi.mocked(api);

function novaTrasa(): string {
  return crypto.randomUUID();
}

describe("offline-queue", () => {
  beforeEach(() => {
    mockedApi.post.mockReset();
    mockedApi.get.mockReset();
    localStorage.clear();
  });

  describe("enqueueZaznam / listRecent", () => {
    it("stores a new entry immediately with stav CEKA, without touching the network", async () => {
      const trasaId = novaTrasa();
      const zaznam = await enqueueZaznam(trasaId, 42);

      expect(zaznam.stav).toBe("CEKA");
      expect(zaznam.puvod).toBe("VLASTNI");
      expect(zaznam.startovniCislo).toBe(42);
      expect(zaznam.typUdalosti).toBe(TypUdalosti.DOJEZD);
      expect(mockedApi.post).not.toHaveBeenCalled();

      const nedavne = await listRecent(trasaId);
      expect(nedavne).toHaveLength(1);
      expect(nedavne[0].localKey).toBe(zaznam.localKey);
    });

    it("returns entries newest-first and respects the limit", async () => {
      const trasaId = novaTrasa();
      await enqueueZaznam(trasaId, 1);
      await new Promise((r) => setTimeout(r, 5));
      await enqueueZaznam(trasaId, 2);
      await new Promise((r) => setTimeout(r, 5));
      await enqueueZaznam(trasaId, 3);

      const nedavne = await listRecent(trasaId, 2);
      expect(nedavne).toHaveLength(2);
      expect(nedavne.map((z) => z.startovniCislo)).toEqual([3, 2]);
    });

    it("scopes entries to their own trasaId", async () => {
      const trasaA = novaTrasa();
      const trasaB = novaTrasa();
      await enqueueZaznam(trasaA, 1);
      await enqueueZaznam(trasaB, 2);

      expect((await listRecent(trasaA)).map((z) => z.startovniCislo)).toEqual([1]);
      expect((await listRecent(trasaB)).map((z) => z.startovniCislo)).toEqual([2]);
    });
  });

  describe("flushFrontu", () => {
    it("does nothing when there is nothing queued", async () => {
      await flushFrontu(novaTrasa(), "zarizeni-1");
      expect(mockedApi.post).not.toHaveBeenCalled();
    });

    it("marks a successfully synced entry as OK with the server-assigned data", async () => {
      const trasaId = novaTrasa();
      const zaznam = await enqueueZaznam(trasaId, 7);

      mockedApi.post.mockResolvedValue({
        vysledky: [
          {
            klientEventId: zaznam.klientEventId,
            stav: "OK",
            zaznam: { id: "server-id-1", prihlaskaId: "prihlaska-1", casCelkem: "00:40:00.00" },
          },
        ],
      });

      await flushFrontu(trasaId, "zarizeni-1");

      expect(mockedApi.post).toHaveBeenCalledWith(
        `/routes/${trasaId}/sync/events`,
        expect.objectContaining({
          zarizeniId: "zarizeni-1",
          events: [
            expect.objectContaining({ klientEventId: zaznam.klientEventId, startovniCislo: 7 }),
          ],
        })
      );

      const [aktualni] = await listRecent(trasaId);
      expect(aktualni.stav).toBe("OK");
      expect(aktualni.serverId).toBe("server-id-1");
      expect(aktualni.casCelkem).toBe("00:40:00.00");
    });

    it("leaves an entry as CEKA (to retry) when the server reports CHYBA for it", async () => {
      const trasaId = novaTrasa();
      const zaznam = await enqueueZaznam(trasaId, 8);

      mockedApi.post.mockResolvedValue({
        vysledky: [{ klientEventId: zaznam.klientEventId, stav: "CHYBA" }],
      });

      await flushFrontu(trasaId, "zarizeni-1");

      const [aktualni] = await listRecent(trasaId);
      expect(aktualni.stav).toBe("CEKA");
    });

    it("leaves the queue untouched when the network request fails", async () => {
      const trasaId = novaTrasa();
      await enqueueZaznam(trasaId, 9);
      mockedApi.post.mockRejectedValue(new Error("network down"));

      await expect(flushFrontu(trasaId, "zarizeni-1")).resolves.toBeUndefined();

      const [aktualni] = await listRecent(trasaId);
      expect(aktualni.stav).toBe("CEKA");
    });
  });

  describe("pullCizi", () => {
    it("stores events from other devices and advances the sync cursor", async () => {
      const trasaId = novaTrasa();
      mockedApi.get.mockResolvedValue({
        eventy: [
          {
            id: "foreign-1",
            startovniCisloRaw: 5,
            cas: "2024-01-01T10:40:00.000Z",
            stav: "OK",
            typUdalosti: TypUdalosti.DOJEZD,
            prihlaskaId: "prihlaska-5",
            casCelkem: "00:40:00.00",
          },
        ],
        cursor: "2024-01-01T10:40:00.000Z",
      });

      await pullCizi(trasaId, "zarizeni-1");

      const nedavne = await listRecent(trasaId);
      expect(nedavne).toHaveLength(1);
      expect(nedavne[0].puvod).toBe("CIZI");
      expect(nedavne[0].startovniCislo).toBe(5);
      expect(localStorage.getItem(`depo_sync_cursor_${trasaId}`)).toBe("2024-01-01T10:40:00.000Z");
    });

    it("maps a NEEDS_REVIEW event to stav NEEDS_REVIEW, not the generic CIZI", async () => {
      const trasaId = novaTrasa();
      mockedApi.get.mockResolvedValue({
        eventy: [
          {
            id: "foreign-2",
            startovniCisloRaw: 6,
            cas: "2024-01-01T10:41:00.000Z",
            stav: "NEEDS_REVIEW",
            typUdalosti: TypUdalosti.DOJEZD,
            prihlaskaId: "prihlaska-6",
            casCelkem: "00:41:00.00",
          },
        ],
        cursor: "2024-01-01T10:41:00.000Z",
      });

      await pullCizi(trasaId, "zarizeni-1");

      const [aktualni] = await listRecent(trasaId);
      expect(aktualni.stav).toBe("NEEDS_REVIEW");
    });

    it("does not throw and leaves the cursor unset when the network request fails", async () => {
      const trasaId = novaTrasa();
      mockedApi.get.mockRejectedValue(new Error("network down"));

      await expect(pullCizi(trasaId, "zarizeni-1")).resolves.toBeUndefined();
      expect(localStorage.getItem(`depo_sync_cursor_${trasaId}`)).toBeNull();
    });
  });
});
