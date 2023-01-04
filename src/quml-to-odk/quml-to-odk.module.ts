import { Module } from '@nestjs/common';
import { QumlToOdkService } from './quml-to-odk.service';
import { QumlToOdkController } from './quml-to-odk.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AppService } from '../app.service';
import { CsvJsonToOdkService } from './csv-json-to-odk.service';
import { FormUploadModule } from '../form-upload/form-upload.module';

@Module({
  controllers: [QumlToOdkController],
  providers: [AppService, QumlToOdkService, CsvJsonToOdkService],
  imports: [ConfigModule, HttpModule, FormUploadModule],
})
export class QumlToOdkModule {}
