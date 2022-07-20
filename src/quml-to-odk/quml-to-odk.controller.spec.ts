import { Test, TestingModule } from '@nestjs/testing';
import { QumlToOdkController } from './quml-to-odk.controller';
import { QumlToOdkService } from './quml-to-odk.service';

describe('QumlToOdkController', () => {
  let controller: QumlToOdkController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QumlToOdkController],
      providers: [QumlToOdkService],
    }).compile();

    controller = module.get<QumlToOdkController>(QumlToOdkController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
