import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { env } from './config/env.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    bufferLogs: true,
  });
  const config = new DocumentBuilder()
    .setTitle('Track API')
    .setDescription('API documentation for Track API')
    .setVersion('0.1')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);
  app.useLogger(app.get(Logger));
  await app.listen(env.PORT);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
