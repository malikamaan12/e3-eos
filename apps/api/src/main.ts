/**
 * E3-EOS Enterprise API & Web Distribution Gateway
 * Release: Progressive Scope & Requirements Matrix (Phases 1-3)
 * Patch: Production release v1.0.4 - Universal Design Testing Lab (PRJ-TEST-ALL-FORMATS) Verified
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ProblemDetailsFilter } from './common/problem.filter.js';
import { allowedWebOrigins, commandOriginMiddleware } from './auth/request-origin.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const origins = allowedWebOrigins();
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) =>
      callback(null, origin !== undefined && origins.has(origin)),
    credentials: true,
  });
  app.use(commandOriginMiddleware(origins));
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new ProblemDetailsFilter());

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`E3-EOS API server running on 0.0.0.0:${port}`);
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}
