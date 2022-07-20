import { Injectable } from '@nestjs/common';
import { QuestionBankFilterDto } from '../dto/question-bank-filter.dto';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, map } from 'rxjs';

@Injectable()
export class QuestionBankService {
  private questionBankUrl =
    'https://dock.sunbirded.org/action/composite/v3/search';

  private questionDetailsUrl = 'https://vdn.diksha.gov.in/api/question/v1/list';

  constructor(private readonly httpService: HttpService) {}

  async fetch(
    filters: QuestionBankFilterDto,
    randomQuesCount: number,
  ): Promise<any> {
    const requestBody = {
      request: {
        filters: {
          se_boards: [filters.board],
          gradeLevel: [filters.grade],
          subject: [filters.subject],
          qType: 'MCQ', // we'll always fetch MCQ questions
          topic: [],
        },
      },
    };

    if (filters.competency !== '') {
      requestBody.request.filters.topic = [filters.competency];
    }
    console.log(requestBody);
    const response = await lastValueFrom(
      this.httpService
        .post(this.questionBankUrl, requestBody, {
          headers: { 'Content-Type': 'application/json' },
        })
        .pipe(
          map((res) => {
            // console.log(res.data);
            return res.status == 200 ? res.data : null;
          }),
        ),
    );

    // if there are questions available and requested random questions count is > available questions from question bank
    if (response.result.count > randomQuesCount) {
      // let's sort the available questions in random order
      const randomQuestionsList = response.result.Question.sort(
        () => Math.random() - 0.5,
      );
      const questionIdentifiers = randomQuestionsList
        .slice(0, randomQuesCount)
        .map((obj) => {
          return obj.identifier;
        });
      console.log(
        'Random question identifiers from ' +
          '(' +
          randomQuesCount +
          '/' +
          response.result.count +
          '):\n' +
          questionIdentifiers,
      );
    } else {
      // either the API failed or less questions available then the required random count
      console.log(
        'either the API failed or less questions available then the required random count',
      );
      return [];
    }
  }
}
