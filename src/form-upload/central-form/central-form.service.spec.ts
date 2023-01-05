import { Test, TestingModule } from '@nestjs/testing';
import { CentralFormService } from './central-form.service';
import { ConfigModule } from '@nestjs/config';

describe('CentralFormService', () => {
  let service: CentralFormService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CentralFormService],
      imports: [ConfigModule],
    }).compile();

    service = module.get<CentralFormService>(CentralFormService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
