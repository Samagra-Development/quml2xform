import { Test, TestingModule } from '@nestjs/testing';
import { ZipFormsController } from './zip-forms.controller';
import { ZipFormsService } from './zip-forms.service';

describe('ZipFormsController', () => {
  let controller: ZipFormsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZipFormsController],
      providers: [ZipFormsService],
    }).compile();

    controller = module.get<ZipFormsController>(ZipFormsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
