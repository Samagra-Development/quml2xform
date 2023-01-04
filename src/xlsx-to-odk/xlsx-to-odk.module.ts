import { Module } from '@nestjs/common';
import { XlsxToOdkController } from './xlsx-to-odk.controller';
import { XlsxToOdkService } from './xlsx-to-odk.service';
import { ConfigModule } from '@nestjs/config';
import { FormUploadModule } from '../form-upload/form-upload.module';
import { HttpModule } from '@nestjs/axios';
import { AppService } from '../app.service';

@Module({
  controllers: [XlsxToOdkController],
  providers: [XlsxToOdkService, AppService],
  imports: [ConfigModule, HttpModule, FormUploadModule],
})
export class XlsxToOdkModule {}
