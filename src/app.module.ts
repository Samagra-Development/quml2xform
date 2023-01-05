import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QumlToOdkModule } from './quml-to-odk/quml-to-odk.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { XlsxToOdkModule } from './xlsx-to-odk/xlsx-to-odk.module';
import {
  FormUploadServiceToken,
  OdkBackendType,
} from './form-upload/form.types';
import { FormService } from './form-upload/form.service';
import { CentralFormService } from './form-upload/central-form/central-form.service';

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
    // FormUploadModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: FormUploadServiceToken,
      useClass:
        process.env.ODK_BACKEND_TYPE == OdkBackendType.AGGREGATE
          ? FormService // For ODK Aggregate form uploads
          : CentralFormService, // For ODK Central form uploads
    },
  ],
  exports: [FormUploadServiceToken],
})
export class AppModule {}
