import { Module } from '@nestjs/common';
import { QumlToOdkService } from './quml-to-odk.service';
import { QumlToOdkController } from './quml-to-odk.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { FormService } from './form-upload/form.service';
import { AppService } from '../app.service';

@Module({
  controllers: [QumlToOdkController],
  providers: [AppService, QumlToOdkService, FormService],
  imports: [ConfigModule, HttpModule],
})
export class QumlToOdkModule {}
