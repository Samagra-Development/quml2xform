import { Module } from '@nestjs/common';
import { QumlToOdkService } from './quml-to-odk.service';
import { QumlToOdkController } from './quml-to-odk.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { FormService } from '../form-upload/form.service';
import { AppService } from '../app.service';
import { CsvJsonToOdkService } from './csv-json-to-odk.service';

@Module({
  controllers: [QumlToOdkController],
  providers: [AppService, QumlToOdkService, FormService, CsvJsonToOdkService],
  imports: [ConfigModule, HttpModule],
})
export class QumlToOdkModule {}
