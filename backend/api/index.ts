import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import serverlessExpress from "@vendia/serverless-express";
import express from "express";
import helmet from "helmet";
import { AppModule } from "../src/app.module";

let cachedHandler: ReturnType<typeof serverlessExpress> | undefined;

async function bootstrap() {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.get<string>("FRONTEND_URL") ?? "http://localhost:5173",
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  await app.init();
  return serverlessExpress({ app: expressApp });
}

export default async function handler(event: unknown, context: unknown, callback: unknown) {
  cachedHandler ??= await bootstrap();
  return cachedHandler(event, context, callback);
}
