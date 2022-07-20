import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QumlToOdkModule } from './quml-to-odk/quml-to-odk.module';
import { QuestionBankService } from './quml-to-odk/fetch-question-bank/question-bank.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [QumlToOdkModule, HttpModule],
  controllers: [AppController],
  providers: [AppService, QuestionBankService],
})
export class AppModule {}
