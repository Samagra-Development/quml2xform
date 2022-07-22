import { Injectable } from '@nestjs/common';
import { GenerateFormDto } from './dto/generate-form.dto';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, map } from 'rxjs';

@Injectable()
export class QumlToOdkService {
  private questionBankUrl: string = process.env.QUESTION_BANK_URL;
  private questionDetailsUrl: string = process.env.QUESTION_BANK_DETAILS_URL;

  constructor(private readonly httpService: HttpService) {}

  async fetchQuestions(filters: GenerateFormDto): Promise<any> {
    console.log(this.questionBankUrl);
    const requestBody = {
      request: {
        filters: {
          se_boards: filters.boards,
          gradeLevel: filters.grades,
          subject: filters.subjects,
          qType: 'MCQ', // we'll always fetch MCQ questions
          topic: filters.competencies,
        },
      },
    };

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

    let questionIdentifiers = [];
    // if there are questions available and requested random questions count is > available questions from question bank
    if (response.result.count > filters.randomQuestionsCount) {
      // let's sort the available questions in random order
      const randomQuestionsList = response.result.Question.sort(
        () => Math.random() - 0.5,
      );
      questionIdentifiers = randomQuestionsList
        .slice(0, filters.randomQuestionsCount)
        .map((obj) => {
          return obj.identifier;
        });
      console.log(
        'Random question identifiers from ' +
          '(' +
          filters.randomQuestionsCount +
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
    }

    let questionsDetails = [];
    if (questionIdentifiers.length) {
      questionsDetails = await this.fetchQuestionDetails(questionIdentifiers);
      console.log(questionsDetails);
    }

    return questionsDetails;
  }

  async fetchQuestionDetails(identifiers) {
    return lastValueFrom(
      this.httpService
        .post(
          this.questionDetailsUrl,
          {
            request: {
              search: {
                identifier: identifiers,
              },
            },
          },
          {
            headers: { 'Content-Type': 'application/json' },
          },
        )
        .pipe(
          map((res) => {
            return res.status == 200 ? res.data : null;
          }),
        ),
    );
  }
}
