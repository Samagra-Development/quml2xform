import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FormUploadServiceToken, FormUploadType } from './form.types';
import { HttpModule } from '@nestjs/axios';
import { FormService } from './form.service';
import { CentralFormService } from './central-form/central-form.service';

@Module({
  imports: [ConfigModule, HttpModule],
  controllers: [],
  providers: [
    {
      provide: FormUploadServiceToken,
      useClass:
        process.env.UPLOAD_FORM_TO == FormUploadType.AGGREGATE
          ? FormService // For ODK Aggregate form uploads
          : CentralFormService, // For ODK Central form uploads
    },
  ],
  exports: [FormUploadServiceToken],
})
export class FormUploadModule {}
