import { forwardRef, Module } from '@nestjs/common';
import { XlsxToOdkController } from './xlsx-to-odk.controller';
import { XlsxToOdkService } from './xlsx-to-odk.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppService } from '../app.service';
import { AppModule } from '../app.module';

@Module({
  controllers: [XlsxToOdkController],
  providers: [XlsxToOdkService, AppService],
  imports: [ConfigModule, HttpModule, forwardRef(() => AppModule)],
})
export class XlsxToOdkModule {}
