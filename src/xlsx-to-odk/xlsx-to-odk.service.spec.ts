import { Test, TestingModule } from '@nestjs/testing';
import { XlsxToOdkService } from './xlsx-to-odk.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { FormUploadModule } from '../form-upload/form-upload.module';
import { AppService } from '../app.service';

describe('XlsxToOdkService', () => {
  let service: XlsxToOdkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigService, XlsxToOdkService, AppService],
      imports: [ConfigModule, HttpModule, FormUploadModule],
    }).compile();

    service = module.get<XlsxToOdkService>(XlsxToOdkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
