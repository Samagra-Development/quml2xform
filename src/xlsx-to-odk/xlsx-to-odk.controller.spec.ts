import { Test, TestingModule } from '@nestjs/testing';
import { XlsxToOdkController } from './xlsx-to-odk.controller';
import { XlsxToOdkService } from './xlsx-to-odk.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppService } from '../app.service';
import { forwardRef } from '@nestjs/common';
import { AppModule } from '../app.module';

describe('XlsxToOdkController', () => {
  let controller: XlsxToOdkController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [XlsxToOdkController],
      providers: [ConfigService, XlsxToOdkService, AppService],
      imports: [ConfigModule, HttpModule, forwardRef(() => AppModule)],
    }).compile();

    controller = module.get<XlsxToOdkController>(XlsxToOdkController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
