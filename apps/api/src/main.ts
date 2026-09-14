import 'reflect-metadata';
import fastifyHelmet from '@fastify/helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';

import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });
  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('PORT');
  const origins = config
    .getOrThrow<string>('WEB_ORIGIN')
    .split(',')
    .map((origin) => origin.trim());

  app.setGlobalPrefix('api');
  await app.register(fastifyHelmet);
  app.enableCors({ origin: origins, credentials: true });
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
