import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { randomUUID } from "crypto";
import { TypStartu, Pohlavi, StavZaznamu } from "@depo/shared";
import { AppModule } from "../src/app.module";

/**
 * End-to-end proti reálné Postgres databázi (viz test/env-setup.ts pro
 * DATABASE_URL) — pokrývá cesty, které mockovaný Prisma v unit testech
 * nemůže ověřit vůbec: skutečné RLS politiky, skutečné FK constrainty,
 * a chování celého požadavkového cyklu (guardy + interceptory + Prisma
 * middleware dohromady), ne jen jednotlivé service metody izolovaně.
 *
 * Migrace se musí spustit předem (`prisma migrate deploy` proti stejné
 * DATABASE_URL) — viz `npm run test:e2e` v CI workflow.
 */
describe("Depo API (e2e)", () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health is public and returns 200", async () => {
    await api().get("/api/v1/health").expect(200);
  });

  it("rejects a write request with no token as 401", async () => {
    await api().post("/api/v1/organizations").send({ nazev: "Bez tokenu" }).expect(401);
  });

  describe("plný uživatelský tok", () => {
    const heslo = "heslo12345";
    let accessToken: string;
    let userId: string;
    let organizaceId: string;
    let eventId: string;
    let routeId: string;
    let kategorieId: string;

    // Druhý, zcela nesouvisející uživatel/organizace — pro ověření RBAC a multi-tenant izolace (F24).
    let ciziAccessToken: string;

    beforeAll(async () => {
      const email = `test-${randomUUID()}@depo.app`;
      const registrace = await api()
        .post("/api/v1/auth/register")
        .send({ email, heslo, jmeno: "Test Uživatel" })
        .expect(201);
      accessToken = registrace.body.accessToken;
      expect(accessToken).toEqual(expect.any(String));

      const me = await api().get("/api/v1/auth/me").set("Authorization", `Bearer ${accessToken}`).expect(200);
      userId = me.body.id;

      const cizi = await api()
        .post("/api/v1/auth/register")
        .send({ email: `cizi-${randomUUID()}@depo.app`, heslo, jmeno: "Cizí Uživatel" })
        .expect(201);
      ciziAccessToken = cizi.body.accessToken;
    });

    it("odmítne přihlášení se špatným heslem", async () => {
      const email = `login-test-${randomUUID()}@depo.app`;
      await api().post("/api/v1/auth/register").send({ email, heslo, jmeno: "X" }).expect(201);
      await api().post("/api/v1/auth/login").send({ email, heslo: "spatne-heslo" }).expect(401);
    });

    it("založí organizaci a vrátí ji jen jejímu vlastníkovi", async () => {
      const org = await api()
        .post("/api/v1/organizations")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ nazev: "Testovací klub" })
        .expect(201);
      organizaceId = org.body.id;

      const moje = await api().get("/api/v1/organizations").set("Authorization", `Bearer ${accessToken}`).expect(200);
      expect(moje.body.map((o: { id: string }) => o.id)).toContain(organizaceId);

      const cizi = await api()
        .get("/api/v1/organizations")
        .set("Authorization", `Bearer ${ciziAccessToken}`)
        .expect(200);
      expect(cizi.body.map((o: { id: string }) => o.id)).not.toContain(organizaceId);
    });

    it("odmítne založení události v cizí organizaci (403)", async () => {
      await api()
        .post("/api/v1/events")
        .set("Authorization", `Bearer ${ciziAccessToken}`)
        .send({ organizaceId, nazev: "Vetřelecká akce", datum: "2026-06-01" })
        .expect(403);
    });

    it("založí událost ve vlastní organizaci a bootstrapne roli ADMIN", async () => {
      const event = await api()
        .post("/api/v1/events")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ organizaceId, nazev: "Jarní běh", datum: "2026-06-01" })
        .expect(201);
      eventId = event.body.id;

      await api()
        .post(`/api/v1/events/${eventId}/roles`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ uzivatelId: userId, role: "ADMIN" })
        .expect(201);
    });

    it("odmítne založení trasy uživatelem bez role na této události (403)", async () => {
      await api()
        .post(`/api/v1/events/${eventId}/routes`)
        .set("Authorization", `Bearer ${ciziAccessToken}`)
        .send({ nazev: "Cizí pokus", pocetKol: 1, typStartu: TypStartu.HROMADNY })
        .expect(403);
    });

    it("založí trasu, kategorii a přihlášku jako ADMIN", async () => {
      const route = await api()
        .post(`/api/v1/events/${eventId}/routes`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ nazev: "10 km", pocetKol: 1, typStartu: TypStartu.HROMADNY })
        .expect(201);
      routeId = route.body.id;

      const kategorie = await api()
        .post(`/api/v1/routes/${routeId}/categories`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ kod: "MUZ", nazev: "Muži", pohlavi: Pohlavi.M })
        .expect(201);
      kategorieId = kategorie.body.id;

      await api()
        .post(`/api/v1/routes/${routeId}/entries`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ startovniCislo: 1, prijmeni: "Novák", jmeno: "Petr", kategorieId })
        .expect(201);

      await api()
        .post(`/api/v1/routes/${routeId}/entries`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ startovniCislo: 2, prijmeni: "Svoboda", jmeno: "Jiří", kategorieId })
        .expect(201);
    });

    describe("zápis měření", () => {
      // Skutečný čas startu vlny (server nastaví new Date() při POST /start) —
      // veškeré klientCas offsety se počítají odsud, ne od fiktivního data.
      let startCas: Date;

      beforeAll(async () => {
        const start = await api()
          .post(`/api/v1/routes/${routeId}/start`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send({})
          .expect(201);
        startCas = new Date(start.body.casStartu);
      });

      it("je idempotentní podle klientEventId — opakované odeslání nevytvoří duplicitní záznam", async () => {
        const klientEventId = randomUUID();
        const body = {
          startovniCislo: 1,
          zarizeniId: randomUUID(),
          klientCas: new Date(startCas.getTime() + 40 * 60_000).toISOString(),
          klientEventId,
        };

        const prvni = await api()
          .post(`/api/v1/routes/${routeId}/records`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(body)
          .expect(201);

        const druhy = await api()
          .post(`/api/v1/routes/${routeId}/records`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(body)
          .expect(201);

        expect(druhy.body.id).toBe(prvni.body.id);
      });

      it("označí druhý DOJEZD stejné přihlášky z jiného zařízení do 15 minut jako NEEDS_REVIEW", async () => {
        // Vlastní startovní číslo (2), aby se test nekřížil s bibem 1 z idempotence testu výše.
        const zarizeniA = randomUUID();
        const zarizeniB = randomUUID();
        const cas = new Date(startCas.getTime() + 45 * 60_000);

        const prvni = await api()
          .post(`/api/v1/routes/${routeId}/records`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send({ startovniCislo: 2, zarizeniId: zarizeniA, klientCas: cas.toISOString(), klientEventId: randomUUID() })
          .expect(201);
        expect(prvni.body.stav).toBe(StavZaznamu.OK);

        const druhy = await api()
          .post(`/api/v1/routes/${routeId}/records`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send({
            startovniCislo: 2,
            zarizeniId: zarizeniB,
            klientCas: new Date(cas.getTime() + 20_000).toISOString(),
            klientEventId: randomUUID(),
          })
          .expect(201);
        expect(druhy.body.stav).toBe(StavZaznamu.NEEDS_REVIEW);

        const konflikty = await api()
          .get(`/api/v1/routes/${routeId}/records/conflicts`)
          .set("Authorization", `Bearer ${accessToken}`)
          .expect(200);
        expect(konflikty.body.map((k: { id: string }) => k.id)).toContain(druhy.body.id);

        await api()
          .patch(`/api/v1/routes/${routeId}/records/${druhy.body.id}/resolve`)
          .set("Authorization", `Bearer ${accessToken}`)
          .expect(200);
      });

      it("vrátí spočítané výsledky veřejně bez přihlášení", async () => {
        const vysledky = await api().get(`/api/v1/routes/${routeId}/results`).expect(200);
        const bezec = vysledky.body.klasifikovani.find((p: { startovniCislo: number }) => p.startovniCislo === 1);
        expect(bezec).toBeDefined();
        expect(bezec.casCelkemMs).toBe(40 * 60_000);
      });
    });

    it("blokuje přístup k cizí události přes multi-tenant RLS (404, ne data)", async () => {
      // "Cizí" uživatel musí mít svou VLASTNÍ organizaci (ne žádnou) — bez
      // organizace se tenant kontext nenastaví vůbec a RLS je permisivní
      // (viz komentář v migraci add_multi_tenant_rls), takže by test
      // neověřoval izolaci mezi tenanty, jen "nepřihlášený nemá org".
      await api()
        .post("/api/v1/organizations")
        .set("Authorization", `Bearer ${ciziAccessToken}`)
        .send({ nazev: "Cizí organizace" })
        .expect(201);

      await api().get(`/api/v1/events/${eventId}`).set("Authorization", `Bearer ${ciziAccessToken}`).expect(404);

      // Vlastní organizace pořád vidí svou vlastní událost beze změny.
      await api().get(`/api/v1/events/${eventId}`).set("Authorization", `Bearer ${accessToken}`).expect(200);
    });
  });
});
