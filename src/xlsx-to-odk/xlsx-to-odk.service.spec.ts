import { Test, TestingModule } from '@nestjs/testing';
import { XlsxToOdkService } from './xlsx-to-odk.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppService } from '../app.service';
import { forwardRef } from '@nestjs/common';
import { AppModule } from '../app.module';

describe('XlsxToOdkService', () => {
  let service: XlsxToOdkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigService, XlsxToOdkService, AppService],
      imports: [ConfigModule, HttpModule, forwardRef(() => AppModule)],
    }).compile();

    service = module.get<XlsxToOdkService>(XlsxToOdkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
