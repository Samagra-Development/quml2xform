import { Test, TestingModule } from '@nestjs/testing';
import { QumlToOdkService } from './quml-to-odk.service';

describe('QumlToOdkService', () => {
  let service: QumlToOdkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QumlToOdkService],
    }).compile();

    service = module.get<QumlToOdkService>(QumlToOdkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
