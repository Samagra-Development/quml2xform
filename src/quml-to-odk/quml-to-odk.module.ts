import { forwardRef, Module } from '@nestjs/common';
import { QumlToOdkService } from './quml-to-odk.service';
import { QumlToOdkController } from './quml-to-odk.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AppService } from '../app.service';
import { CsvJsonToOdkService } from './csv-json-to-odk.service';
import { AppModule } from '../app.module';
import { DataService } from "./data.service";

@Module({
  controllers: [QumlToOdkController],
  providers: [AppService, QumlToOdkService, CsvJsonToOdkService, DataService],
  imports: [ConfigModule, HttpModule, forwardRef(() => AppModule)],
})
export class QumlToOdkModule {}
