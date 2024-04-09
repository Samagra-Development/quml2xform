import { Test, TestingModule } from '@nestjs/testing';
import { ZipFormsService } from './zip-forms.service';

describe('ZipFormsService', () => {
  let service: ZipFormsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ZipFormsService],
    }).compile();

    service = module.get<ZipFormsService>(ZipFormsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
