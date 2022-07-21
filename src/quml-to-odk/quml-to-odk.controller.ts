import { Controller, Post, Body} from '@nestjs/common';
import { QuestionBankFilterDto } from './dto/question-bank-filter.dto';
import { QuestionBankService } from './fetch-question-bank/question-bank.service';

@Controller('quml-to-odk')
export class QumlToOdkController {
  constructor(private readonly questionBankService: QuestionBankService) {}

  @Post()
  create(@Body() createQumlToOdkDto: QuestionBankFilterDto): any {
    return this.questionBankService.fetch(createQumlToOdkDto);
  }
}
