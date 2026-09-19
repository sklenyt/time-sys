import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.getHttpAdapter().getInstance().set("trust proxy", 1); // za reverzní proxy/managed platformou terminující TLS (08-security.md §8.8)
  app.use(
    helmet({
      // Vlastní veřejná stránka výsledků (Vite SPA) je samostatná aplikace
      // na jiném originu — API vrací jen JSON/SSE, ne HTML k omezování CSP.
      contentSecurityPolicy: false,
    })
  );
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })
  );
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Depo API běží na http://localhost:${port}/api/v1`);
}

bootstrap();
