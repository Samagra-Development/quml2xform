import { Injectable, Logger } from '@nestjs/common';
import { QumlToOdkService } from './quml-to-odk.service';
import { GenerateFormDto } from './dto/generate-form.dto';
import { QuestionTypesEnum } from './enums/question-types.enum';

@Injectable()
export class CsvJsonToOdkService extends QumlToOdkService {
  private apiResponse;
  private filters: Array<GenerateFormDto>;

  protected readonly logger = new Logger(CsvJsonToOdkService.name); // logger instance

  public async generateViaJson(
    body,
    randomQuestionsCount: number,
    board: string,
  ): Promise<any> {
    this.__prepare(body, randomQuestionsCount, board); // prepare the Api Response object
    this.logger.log(`Records found: ${this.filters.length}`);
    const response: Array<GenerateFormDto> = [];
    for (let i = 0; i < this.filters.length; i++) {
      const filter = this.filters[i];
      this.logger.debug(`Running against filter:  ${JSON.stringify(filter)}`);
      let result = {};
      let error = '';
      try {
        result = await this.generate(filter);
        filter['result'] = result;
      } catch (e) {
        error = e.toString();
        filter['result'] = error;
      }
      response.push(filter);
      this.logger.debug(`Finished ${i}/${this.filters.length}...`);
    }
    return response;
  }

  private static __get_record_key(
    grade: string,
    subject: string,
    competency: string,
  ) {
    return `${grade}-${subject}-${competency}`;
  }

  private __prepare(body, randomQuestionsCount: number, board: string) {
    this.apiResponse = {};
    this.filters = [];
    body.forEach((item) => {
      const key = CsvJsonToOdkService.__get_record_key(
        item['Grade'],
        item['Subject'],
        item['Competencies'],
      );
      if (!this.apiResponse[key]) {
        // initialize blank object
        this.apiResponse[key] = {
          id: 'api.questions.list',
          ver: '3.0',
          ts: '2022-10-22T09:14:40ZZ',
          params: {
            resmsgid: 'ece06192-9ea6-4fc3-a91b-c5ad52f0799e',
            msgid: null,
            err: null,
            status: 'successful',
            errmsg: null,
          },
          responseCode: 'OK',
          result: {
            questions: [],
            count: 0,
          },
        };

        // prepare filters
        this.filters.push({
          board: board,
          competency: item['Competencies'],
          grade: item['Grade'],
          qType: QuestionTypesEnum.MCQ,
          randomQuestionsCount: randomQuestionsCount,
          subject: item['Subject'],
        });
      }

      const options = [];
      for (let i = 1; i < 5; i++) {
        const optionKey = `option ${i}`;
        options.push({
          answer: item['CorrectAnswer(1/2/3/4)'] == i,
          value: {
            body: item[optionKey],
            value: i - 1,
          },
        });
      }

      this.apiResponse[key]['result']['questions'].push({
        editorState: {
          options: options,
          question: item['Question'],
        },
      });

      this.apiResponse[key]['result']['count'] += 1;
    });
  }

  protected async fetchQuestions(filters: GenerateFormDto): Promise<any> {
    const recordKey = CsvJsonToOdkService.__get_record_key(
      filters.grade,
      filters.subject,
      filters.competency,
    );
    return this.apiResponse[recordKey];
  }
}
