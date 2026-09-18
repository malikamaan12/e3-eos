/**
 * E3-EOS Enterprise API & Web Distribution Gateway
 * Release: Progressive Scope & Requirements Matrix (Phases 1-3)
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ProblemDetailsFilter } from './common/problem.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new ProblemDetailsFilter());

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`E3-EOS API server running on 0.0.0.0:${port}`);
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}
