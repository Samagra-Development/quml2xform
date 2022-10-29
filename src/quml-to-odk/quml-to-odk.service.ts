import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotImplementedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { GenerateFormDto } from './dto/generate-form.dto';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, map } from 'rxjs';
import { exec } from 'child_process';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import { McqParser } from './parsers/mcq.parser';
import { QuestionTypesEnum } from './enums/question-types.enum';
import { FormService } from './form-upload/form.service';
import * as https from 'https';
import * as fs from 'fs';
import * as striptags from 'striptags';
import nodeHtmlToImage from 'node-html-to-image';
import { AppService } from '../app.service';

@Injectable()
export class QumlToOdkService {
  private readonly maxFormsAllowed: number;
  private readonly baseUrl: string;
  private readonly questionBankUrl: string;
  private readonly questionDetailsUrl: string;
  private readonly hasuraDumpFormMapping: boolean;
  private readonly uploadFormsToAggregate: boolean;

  protected readonly logger = new Logger(QumlToOdkService.name); // logger instance

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly formService: FormService,
    private readonly appService: AppService,
  ) {
    this.baseUrl = configService.get<string>('QUML_ODK_BASE_URL');
    this.questionBankUrl = configService.get<string>(
      'QUML_ODK_QUESTION_BANK_URL',
    );
    this.questionDetailsUrl = configService.get<string>(
      'QUML_ODK_QUESTION_BANK_DETAILS_URL',
    );
    this.maxFormsAllowed = configService.get<number>('MAX_FORMS_ALLOWED', 10);
    this.hasuraDumpFormMapping =
      configService.get<string>('HASURA_DUMP_FORMS_MAPPING', 'FALSE') ===
      'TRUE';
    this.uploadFormsToAggregate =
      configService.get<string>('UPLOAD_FORMS', 'FALSE') === 'TRUE';
  }

  public async generate(filters: GenerateFormDto) {
    let error = false;
    let errorMsg = '';
    this.logger.debug('Fetching questions..');
    const questions = await this.fetchQuestions(filters);
    if (questions && questions.result && questions.result.count) {
      let service;

      // based on question type, we'll use different parsers
      switch (filters.qType) {
        case QuestionTypesEnum.MCQ:
          service = new McqParser(this); // create the instance
          break;
        default:
          throw new NotImplementedException(
            'Service not implemented',
            "Parser for the given question type isn't available.",
          ); // ideally this part should be handled at validation level itself
      }

      const xlsxFormFiles: Array<string> = [];
      const odkFormFiles: Array<string> = [];
      const formIds: Array<string> = [];
      const formsToGenerate: number = Math.floor(
        questions.result.count / filters.randomQuestionsCount,
      );
      this.logger.debug('Forms to generate: ' + formsToGenerate);
      for (let i = 0; i < formsToGenerate; i++) {
        if (i + 1 > this.maxFormsAllowed) {
          this.logger.log(
            `Max form generation count is limited to: ${this.maxFormsAllowed}. Stopping..`,
          );
          break;
        }
        const templateFileName = uuid(); // initialize the template name
        const start = parseInt(String(i * filters.randomQuestionsCount));
        const end = start + parseInt(String(filters.randomQuestionsCount));
        const formQuestions = questions.result.questions.slice(start, end);

        this.logger.debug(`Generating XSLX form..${i}`);
        const form = await service.createForm(
          formQuestions,
          filters,
          './gen/xlsx/' + templateFileName + '.xlsx',
        );
        const xlsxFormFile = form[0];
        const formImageFiles = form[1];

        this.logger.debug(`Generating ODK form..${i}`);
        const odkFormFile = './gen/xml/' + templateFileName + '.xml';
        if (!(await this.convertExcelToOdkForm(xlsxFormFile, odkFormFile))) {
          throw new InternalServerErrorException('Form generation failed.');
        }

        if (this.uploadFormsToAggregate) {
          // if form upload to aggregate allowed
          this.logger.debug(
            `Uploading form..${i} Image files:`,
            formImageFiles,
          );
          const formUploadResponse = await this.formService.uploadForm(
            odkFormFile,
            formImageFiles,
          );
          if (
            formUploadResponse &&
            formUploadResponse.status &&
            formUploadResponse.status === 'UPLOADED'
          ) {
            formIds.push(formUploadResponse.data.formID);
          } else {
            error = true;
            errorMsg = 'Form Upload Failed!';
            this.logger.error(`Form Upload error..${i}`, formUploadResponse);
          }
        }
        xlsxFormFiles.push(xlsxFormFile);
        odkFormFiles.push(odkFormFile);
      } // for() end

      if (this.hasuraDumpFormMapping && formIds.length) {
        this.logger.debug('Uploading entries into Hasura...');
        const grade = filters.grade
          .toLowerCase()
          .replace('class', '')
          .replace(' ', '');
        await this.uploadMappingToHasura(
          filters.subject,
          parseInt(grade),
          filters.competency,
          formIds,
        );
      }
      return {
        xlsxFiles: xlsxFormFiles,
        odkFiles: odkFormFiles,
        formIds: formIds,
        error: error,
        errorMsg: errorMsg,
      };
    }
    throw new UnprocessableEntityException(
      'Questions not available.',
      'Please ensure there are questions available for the matching combination.',
    );
  }

  protected async fetchQuestions(filters: GenerateFormDto): Promise<any> {
    const requestBody = {
      request: {
        filters: {
          se_boards: filters.board,
          gradeLevel: filters.grade,
          subject: filters.subject,
          qType: filters.qType,
          learningOutcome: filters.competency,
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
            return res.status == 200 ? res.data : null;
          }),
        ),
    );

    let questionIdentifiers = [];
    // if there are questions available and requested random questions count is > available questions from question bank
    if (response && response.result.count >= filters.randomQuestionsCount) {
      // let's sort the available questions in random order
      const randomQuestionsList = response.result.Question.sort(
        () => Math.random() - 0.5,
      );
      questionIdentifiers = randomQuestionsList.map((obj) => {
        return obj.identifier;
      });
      this.logger.debug(
        'Questions fetched ' +
          '(' +
          filters.randomQuestionsCount +
          '/' +
          response.result.count +
          '): ' +
          questionIdentifiers,
      );
    } else {
      // either the API failed or less questions available than the required random count
      this.logger.debug('Requested questions count is not available!!');
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    let questions: {} = [];
    if (questionIdentifiers.length) {
      questions = await this.fetchQuestionDetails(questionIdentifiers);
    }
    return questions;
  }

  private async fetchQuestionDetails(identifiers) {
    let result = {};
    const chunkSize = 20; // because the API allows searching for 20 max at a time
    for (let i = 0; i < identifiers.length; i += chunkSize) {
      const chunk = identifiers.slice(i, i + chunkSize);
      // eslint-disable-next-line @typescript-eslint/ban-types
      const fetchedResult: object = await lastValueFrom(
        this.httpService
          .post(
            this.questionDetailsUrl,
            {
              request: {
                search: {
                  identifier: chunk,
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

      if (Object.keys(result).length === 0) {
        result = fetchedResult;
      } else {
        result['result']['questions'] = result['result']['questions'].concat(
          fetchedResult['result']['questions'],
        );
        result['result']['count'] += fetchedResult['result']['count'];
      }
    }
    return result;
  }

  private async convertExcelToOdkForm(
    inputFile: string,
    outputFile: string,
  ): Promise<boolean> {
    // Make sure the binary is installed system wide; Ref: https://github.com/XLSForm/pyxform
    const command = 'xls2xform ' + inputFile + ' ' + outputFile;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return await new Promise(function (resolve, reject) {
      exec(command, (error) => {
        if (error) {
          self.logger.error('Error generating ODK form: ', error);
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

  public static cleanHtml(
    str: string,
    nbspAsLineBreak = false,
    removeTable = true,
  ) {
    str = str + ''; // parse to string
    // Remove HTML tags
    if (removeTable) {
      // if passed, we remove the image figure tag; Use case: we are replacing table with Image
      str = str.replace(/<\s*figure class="table">(.*?)<\s*\/\s*figure>/g, '');
    }
    str = striptags(str);
    return str
      .replace(/&nbsp;/g, nbspAsLineBreak ? '\n' : '')
      .replace(/&gt;/g, '>') // parsing for > symbol
      .replace(/&lt;/g, '<'); // parsing for < symbol
  }

  public static findImageFromBody(body: string): any {
    // check if there is directly an image URL
    const regex = /<img[^>]+src="([^">]+)"/g;
    let matches;
    let src = null;
    if ((matches = regex.exec(body)) !== null) {
      src = matches[1] ? matches[1] : null;
    }
    return src;
  }

  /**
   * Returns null or an object containing image path & name
   * @param image
   */
  public saveImage(image: string) {
    let imagePath = null;
    let imageName = null;
    const templateName = uuid();
    try {
      if (image.substring(0, 10) === 'data:image') {
        const base64Data = image.split('base64,')[1];
        const extension = image.split(';')[0].split('/')[1];
        imageName = `${templateName}.${extension}`;
        imagePath = `./gen/images/${templateName}.${extension}`;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        fs.writeFile(imagePath, base64Data, 'base64', function (err) {
          if (err) {
            self.logger.error('Error writing image file (1): ', err);
          }
        });
      } else {
        const extension = image.split('.').slice(-1)[0];
        imageName = `${templateName}.${extension}`;
        imagePath = `./gen/images/${templateName}.${extension}`;
        if (image.substring(0, 4) !== 'http') {
          // if it's not an absolute URL, we need to make it full absolute URL
          image = this.baseUrl + image;
        }
        https.get(image, (resp) => resp.pipe(fs.createWriteStream(imagePath)));
      }
    } catch (e) {
      this.logger.error('Error writing image file (2): ', e);
      throw e;
    }

    return {
      path: imagePath,
      name: imageName,
    };
  }

  /**
   * Find and returns all tables present inside <figure class="table"></figure> tags
   * @param body
   * return Array<string>
   */
  public static findTablesFromHtml(body: string): Array<string> {
    const regex = /<\s*figure class="table">(.*?)<\s*\/\s*figure>/g;
    let matches;
    const tables = [];
    while (true) {
      if ((matches = regex.exec(body)) === null) {
        // break when nothing found anymore
        break;
      }
      tables.push(matches[1]);
    }
    return tables;
  }

  public async htmlTableToImage(tables: string): Promise<string> {
    const name = uuid();
    const path = `./gen/images/${name}.png`;
    await nodeHtmlToImage({
      output: path,
      html: tables,
      transparent: true,
      quality: 100,
      selector: 'table',
    });
    return path;
  }

  private async uploadMappingToHasura(
    subject: string,
    grade: number,
    competency: string,
    refIds: Array<string>,
    mappingType = 'odk',
  ) {
    const queryCompetency = {
      query: `
        query CompetencyQuery($name: String) {
          competencies(where: {name: {_eq: $name}}, limit: 1) {
            id
          }
        }`,
      variables: { name: competency },
    };
    const result = await this.appService.hasuraGraphQLCall(queryCompetency);
    let competencyId: number;
    if (result?.data?.competencies?.length) {
      competencyId = result.data.competencies[0].id;
      this.logger.debug(`Competency ID found: ${competencyId}`);
    } else {
      const queryInsert = {
        query: `
          mutation MyMutation($name: String) {
            insert_competencies_one(object: {name: $name}) {
              id
            }
          }`,
        variables: { name: competency },
      };
      const result = await this.appService.hasuraGraphQLCall(queryInsert);
      if (result?.data?.insert_competencies_one?.id) {
        competencyId = result.data.insert_competencies_one.id;
        this.logger.debug(`Competency ID inserted: ${competencyId}`);
      }
    }
    if (competencyId) {
      const queryWorkflowMapping = {
        query: `
          query MyQuery($competencyId: Int, $grade: Int, $subject: String, $type: String) {
            workflow_refids_mapping(where: {competency_id: {_eq: $competencyId}, grade: {_eq: $grade}, subject: {_eq: $subject}, type: {_eq: $type}}) {
              id
              ref_ids
            }
          }`,
        variables: {
          competencyId: competencyId,
          grade: grade,
          subject: subject,
          type: mappingType,
        },
      };
      const result = await this.appService.hasuraGraphQLCall(
        queryWorkflowMapping,
      );
      if (result?.data?.workflow_refids_mapping?.length) {
        refIds = refIds.concat(result.data.workflow_refids_mapping[0].ref_ids);
        this.logger.debug(`Existing ref_ids found: ${refIds}`);
      }
      if (refIds.length) {
        const queryInsert = {
          query: `
            mutation MyMutation($competencyId: Int, $grade: Int, $subject: String, $type: String, $refIds: jsonb) {
              insert_workflow_refids_mapping_one(
                object: {competency_id: $competencyId, grade: $grade, subject: $subject, type: $type, ref_ids: $refIds},
                on_conflict: {constraint: workflow_refids_mapping_competency_id_grade_subject_type_key, update_columns: ref_ids}
              ) {
                id
              }
            }`,
          variables: {
            competencyId: competencyId,
            grade: grade,
            subject: subject,
            type: mappingType,
            refIds: refIds,
          },
        };
        const result = await this.appService.hasuraGraphQLCall(queryInsert);
        if (result?.data?.insert_workflow_refids_mapping_one) {
          this.logger.log(`Workflow RefIds added/updated in Hasura: ${refIds}`);
        }
      }
    } else {
      this.logger.warn(
        `Tried inserting new Competency ID but failed for some reason!!!`,
      );
    }
  }

  public async generateBulk(body): Promise<Array<GenerateFormDto>> {
    this.logger.debug('Total records found: ' + body.length);
    const response: Array<GenerateFormDto> = [];
    let count = 0;
    for (const object of body) {
      count++;
      let result = {};
      let error = '';
      try {
        result = await this.generate(object);
        object['result'] = result;
      } catch (e) {
        error = e.toString();
        object['result'] = error;
      }
      response.push(object);
      this.logger.debug(
        `${count}. processed..` + JSON.stringify(object['result']),
      );
    }
    return response;
  }
}
