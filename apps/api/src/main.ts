import 'reflect-metadata';
import { config } from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'node:path';
import helmet from 'helmet';
config({path:['.env','../../.env']});

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy',1);
  app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}));
  app.useBodyParser('json',{limit:'1mb'});
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  app.setGlobalPrefix('api/v1');
  const allowed=(process.env.CORS_ORIGINS??'http://localhost:3000').split(',').map(value=>value.trim());
  app.enableCors({origin:(origin,callback)=>callback(null,!origin||allowed.includes(origin)),credentials:true,methods:['GET','POST','PATCH','DELETE'],allowedHeaders:['Content-Type','X-Admin-Key']});
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted:true, transform: true }));
  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();
