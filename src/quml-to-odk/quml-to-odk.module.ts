import { Module } from '@nestjs/common';
import { QumlToOdkService } from './quml-to-odk.service';
import { QumlToOdkController } from './quml-to-odk.controller';
import { QuestionBankService } from './fetch-question-bank/question-bank.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [QumlToOdkController],
  providers: [QumlToOdkService, QuestionBankService],
  imports: [HttpModule],
})
export class QumlToOdkModule {}
