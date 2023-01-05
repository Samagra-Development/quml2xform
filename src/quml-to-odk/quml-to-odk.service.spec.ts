import { Test, TestingModule } from '@nestjs/testing';
import { QumlToOdkService } from './quml-to-odk.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppModule } from '../app.module';
import { AppService } from '../app.service';
import { forwardRef } from '@nestjs/common';

describe('QumlToOdkService', () => {
  let service: QumlToOdkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QumlToOdkService, AppService],
      imports: [
        AppModule,
        ConfigModule,
        HttpModule,
        forwardRef(() => AppModule),
      ],
    }).compile();

    service = module.get<QumlToOdkService>(QumlToOdkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
