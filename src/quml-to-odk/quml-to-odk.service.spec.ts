import { Test, TestingModule } from '@nestjs/testing';
import { QumlToOdkService } from './quml-to-odk.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { FormService } from '../form-upload/form.service';
import { FormUploadModule } from '../form-upload/form-upload.module';
import { AppModule } from '../app.module';
import { AppService } from '../app.service';

describe('QumlToOdkService', () => {
  let service: QumlToOdkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QumlToOdkService, AppService, FormService],
      imports: [AppModule, ConfigModule, HttpModule, FormUploadModule],
    }).compile();

    service = module.get<QumlToOdkService>(QumlToOdkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
