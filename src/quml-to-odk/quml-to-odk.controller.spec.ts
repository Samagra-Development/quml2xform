import { Test, TestingModule } from '@nestjs/testing';
import { QumlToOdkController } from './quml-to-odk.controller';
import { QumlToOdkService } from './quml-to-odk.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { FormService } from '../form-upload/form.service';
import { AppService } from '../app.service';
import { CsvJsonToOdkService } from './csv-json-to-odk.service';
import { forwardRef } from '@nestjs/common';
import { AppModule } from '../app.module';

describe('QumlToOdkController', () => {
  let controller: QumlToOdkController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QumlToOdkController],
      providers: [
        QumlToOdkService,
        AppService,
        FormService,
        CsvJsonToOdkService,
      ],
      imports: [ConfigModule, HttpModule, forwardRef(() => AppModule)],
    }).compile();

    controller = module.get<QumlToOdkController>(QumlToOdkController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
