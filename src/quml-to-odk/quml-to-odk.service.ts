import { Injectable } from '@nestjs/common';
import { QuestionBankFilterDto } from './dto/question-bank-filter.dto';

@Injectable()
export class QumlToOdkService {
  create(createQumlToOdkDto: QuestionBankFilterDto) {
    return 'This action adds a new qumlToOdk';
  }
}
