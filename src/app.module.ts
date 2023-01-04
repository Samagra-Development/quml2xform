import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QumlToOdkModule } from './quml-to-odk/quml-to-odk.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { FormUploadModule } from './form-upload/form-upload.module';
import { XlsxToOdkModule } from './xlsx-to-odk/xlsx-to-odk.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
    }),
    HttpModule,
    QumlToOdkModule,
    XlsxToOdkModule,
    FormUploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
