import { Injectable } from '@nestjs/common';
import { GenerateFormDto } from './dto/generate-form.dto';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, map } from 'rxjs';
import { exec } from 'child_process';

@Injectable()
export class QumlToOdkService {
  // config file for the variables being used across the service
  private config = {
    questionBankUrl: process.env.QUML_ODK_QUESTION_BANK_URL,
    questionDetailsUrl: process.env.QUML_ODK_QUESTION_BANK_DETAILS_URL,
    xslxFilesPath: process.env.QUML_ODK_QUESTION_BANK_DETAILS_URL
      ? process.env.QUML_ODK_QUESTION_BANK_DETAILS_URL
      : './xslxForms', // defaults to current directory
    odkFormsPath: process.env.QUML_ODK_QUESTION_BANK_DETAILS_URL
      ? process.env.QUML_ODK_QUESTION_BANK_DETAILS_URL
      : './odkForms', // defaults to current directory
  };

  constructor(private readonly httpService: HttpService) {}

  async fetchQuestions(filters: GenerateFormDto): Promise<any> {
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
        .post(this.config.questionBankUrl, requestBody, {
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
          this.config.questionDetailsUrl,
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

  async convertExcelToOdkForm(
    inputFile: string,
    outputFile: string,
  ): Promise<boolean> {
    // Make sure the binary is installed system wide; Ref: https://github.com/XLSForm/pyxform
    const command = 'xls2xform ' + inputFile + ' ' + outputFile;
    return await new Promise(function (resolve, reject) {
      exec(command, (error) => {
        if (error) {
          console.log(error);
          reject(false);
          return;
        }
        resolve(true);
      });
    })
      .then((success: boolean) => {
        return success;
      })
      .catch((failed: boolean) => {
        return failed;
      });
  }
}
