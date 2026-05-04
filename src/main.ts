import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

import { json, urlencoded } from 'express';
import { buildCorsMiddleware } from './common/middleware/cors.middleware';
import { swaggerAuthMiddleware } from './common/middleware/swagger-auth.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase payload limits
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Security Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Standardized Response & Error Handling
  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));
  app.useGlobalInterceptors(new TransformInterceptor());

  // CORS — path-aware, see src/common/middleware/cors.middleware.ts
  app.use(buildCorsMiddleware());

  // Global API Prefix — /v1/... (deploy on api.wagex.lk)
  app.setGlobalPrefix('v1');

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('SalaryApp API')
    .setDescription('Enterprise Grade Salary Management API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  // Swagger — protected by ?key=<SWAGGER_KEY>
  app.use(['/docs', '/docs-json'], swaggerAuthMiddleware);

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 8000;
  await app.listen(port, '0.0.0.0'); // <-- bind to all IPv4 interfaces
  console.log(`Server running on port ${port}`);
}
bootstrap();
