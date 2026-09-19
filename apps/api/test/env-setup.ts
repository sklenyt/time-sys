/**
 * Výchozí testovací proměnné prostředí pro e2e testy (spouští se jako
 * jest `setupFiles`, tedy dřív než se importuje AppModule). `??=` nechává
 * přednost hodnotám, které si CI/lokální vývojář nastaví sám (např.
 * DATABASE_URL na ephemerní Postgres service container v CI).
 */
process.env.DATABASE_URL ??= "postgresql://depo:depo_dev_password@localhost:5432/depo_test";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
process.env.JWT_ACCESS_TTL ??= "15m";
process.env.JWT_REFRESH_TTL ??= "30d";
process.env.PUBLISH_TARGET_ENC_KEY ??= "0".repeat(64);
