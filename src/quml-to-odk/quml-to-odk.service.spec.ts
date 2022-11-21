import { Test, TestingModule } from '@nestjs/testing';
import { QumlToOdkService } from './quml-to-odk.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

describe('QumlToOdkService', () => {
  let service: QumlToOdkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QumlToOdkService],
      imports: [ConfigModule, HttpModule],
    }).compile();

    service = module.get<QumlToOdkService>(QumlToOdkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
