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

@Injectable()
export class QumlToOdkService {
  private readonly questionBankUrl: string;
  private readonly questionDetailsUrl: string;

  private readonly logger = new Logger(QumlToOdkService.name); // logger instance

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly formService: FormService,
  ) {
    this.questionBankUrl = configService.get<string>(
      'QUML_ODK_QUESTION_BANK_URL',
    );
    this.questionDetailsUrl = configService.get<string>(
      'QUML_ODK_QUESTION_BANK_DETAILS_URL',
    );
  }

  public async generate(filters: GenerateFormDto) {
    this.logger.debug('Fetching questions..');
    const questions = await this.fetchQuestions(filters);
    if (questions.result && questions.result.count) {
      const templateFileName = uuid(); // initialize the template name
      let service;

      // based on question type, we'll use different parsers
      switch (filters.qType) {
        case QuestionTypesEnum.MCQ:
          service = new McqParser(); // create the instance
          break;
        default:
          throw new NotImplementedException(
            'Service not implemented',
            "Parser for the given question type isn't available.",
          ); // ideally this part should be handled at validation level itself
      }

      this.logger.debug('Generating XSLX form..');
      const form = service.createForm(
        questions,
        filters,
        './gen/xlsx/' + templateFileName + '.xlsx',
      );
      const xlsxFormFile = form[0];
      const formImageFiles = form[1];

      this.logger.debug('Generating ODK form..');
      const odkFormFile = './gen/xml/' + templateFileName + '.xml';
      if (!(await this.convertExcelToOdkForm(xlsxFormFile, odkFormFile))) {
        throw new InternalServerErrorException('Form generation failed.');
      }

      this.logger.debug('Uploading form.. Image files:', formImageFiles);
      const response = await this.formService.uploadForm(
        odkFormFile,
        formImageFiles,
      );
      this.logger.debug(response);
      return {
        xlsxFile: xlsxFormFile,
        odkFile: odkFormFile,
        formUploadResponse: response,
      };
    }
    throw new UnprocessableEntityException(
      'Questions not available.',
      'Please ensure there are questions available for the matching combination.',
    );
  }

  private async fetchQuestions(filters: GenerateFormDto): Promise<any> {
    const requestBody = {
      request: {
        filters: {
          se_boards: filters.boards,
          gradeLevel: filters.grades,
          subject: filters.subjects,
          qType: filters.qType,
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
            return res.status == 200 ? res.data : null;
          }),
        ),
    );

    let questionIdentifiers = [];
    // if there are questions available and requested random questions count is > available questions from question bank
    if (response.result.count >= filters.randomQuestionsCount) {
      // let's sort the available questions in random order
      const randomQuestionsList = response.result.Question.sort(
        () => Math.random() - 0.5,
      );
      questionIdentifiers = randomQuestionsList
        .slice(0, filters.randomQuestionsCount)
        .map((obj) => {
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

    let questions = [];
    if (questionIdentifiers.length) {
      questions = await this.fetchQuestionDetails(questionIdentifiers);
    }
    return questions;
  }

  private async fetchQuestionDetails(identifiers) {
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

  private async convertExcelToOdkForm(
    inputFile: string,
    outputFile: string,
  ): Promise<boolean> {
    // Make sure the binary is installed system wide; Ref: https://github.com/XLSForm/pyxform
    const command = 'xls2xform ' + inputFile + ' ' + outputFile;
    return await new Promise(function (resolve, reject) {
      exec(command, (error) => {
        if (error) {
          console.log('Error generating ODK form: ', error);
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

  public static cleanHtml(str: string, nbspAsLineBreak = false) {
    // Remove HTML tags
    str = striptags(str, ['strong']); // allow strong tag
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
  public static saveImage(image: string) {
    let imagePath = null;
    let imageName = null;
    const templateName = uuid();
    try {
      if (image.substring(0, 10) === 'data:image') {
        const base64Data = image.split('base64,')[1];
        const extension = image.split(';')[0].split('/')[1];
        imageName = `${templateName}.${extension}`;
        imagePath = `./gen/images/${templateName}.${extension}`;
        fs.writeFile(imagePath, base64Data, 'base64', function (err) {
          if (err) {
            console.log('Error writing image file (1): ', err);
          }
        });
      } else {
        const extension = image.split('.').slice(-1)[0];
        imageName = `${templateName}.${extension}`;
        imagePath = `./gen/images/${templateName}.${extension}`;
        https.get(image, (resp) => resp.pipe(fs.createWriteStream(imagePath)));
      }
    } catch (e) {
      console.log('Error writing image file (2): ', e);
    }

    return {
      path: imagePath,
      name: imageName,
    };
  }
}
