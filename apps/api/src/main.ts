import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ProblemDetailsFilter } from './common/problem.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new ProblemDetailsFilter());

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`E3-EOS API server running on port ${port}`);
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}
