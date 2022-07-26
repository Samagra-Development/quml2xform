import { Module } from '@nestjs/common';
import { QumlToOdkService } from './quml-to-odk.service';
import { QumlToOdkController } from './quml-to-odk.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { FormService } from './form.service';

@Module({
  controllers: [QumlToOdkController],
  providers: [QumlToOdkService, FormService],
  imports: [ConfigModule, HttpModule],
})
export class QumlToOdkModule {}
