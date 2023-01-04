import { Test, TestingModule } from '@nestjs/testing';
import { XlsxToOdkController } from './xlsx-to-odk.controller';
import { XlsxToOdkService } from './xlsx-to-odk.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { FormUploadModule } from '../form-upload/form-upload.module';
import { AppService } from '../app.service';

describe('XlsxToOdkController', () => {
  let controller: XlsxToOdkController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [XlsxToOdkController],
      providers: [ConfigService, XlsxToOdkService, AppService],
      imports: [ConfigModule, HttpModule, FormUploadModule],
    }).compile();

    controller = module.get<XlsxToOdkController>(XlsxToOdkController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
