import { Injectable } from '@nestjs/common';
import { GenerateFormDto } from './dto/generate-form.dto';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, map } from 'rxjs';
import { exec } from 'child_process';
import * as XLSX from 'xlsx';

@Injectable()
export class QumlToOdkService {
  // config file for the variables being used across the service
  private config = {
    questionBankUrl: process.env.QUML_ODK_QUESTION_BANK_URL,
    questionDetailsUrl: process.env.QUML_ODK_QUESTION_BANK_DETAILS_URL,
    xlsxFilesPath: process.env.QUML_XLSX_FILE_STORAGE_PATH,
    odkFormsPath: process.env.QUML_ODK_FORM_FILE_STORAGE_PATH,
  };

  constructor(private readonly httpService: HttpService) {}

  public async generate(filters: GenerateFormDto) {
    const questions = await this.fetchQuestions(filters);
    if (questions.result && questions.result.count) {
      const parsedResult = this.parseQuestionsForXslxForm(questions, filters);
      const xlsxFormFile = this.createXslx(
        parsedResult[0],
        parsedResult[1],
        parsedResult[2],
        parsedResult[3],
      );

      const odkFormName = +new Date() + '.xml';
      const odkFormFile = this.config.odkFormsPath + '/' + odkFormName;
      await this.convertExcelToOdkForm(xlsxFormFile, odkFormFile);
      return {
        xlsx_file: xlsxFormFile,
        odk_file: odkFormFile,
      };
    }
    console.log(
      'Please ensure there are questions available for the matching combination',
    );
    return 'Please ensure there are questions available for the matching combination';
  }

  private async fetchQuestions(filters: GenerateFormDto): Promise<any> {
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

  private async convertExcelToOdkForm(
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

  /**
   * Prepares the XSLX form sheets data as per the provided template file: https://docs.google.com/spreadsheets/d/1GIcHghGYUR1FZ31BD-LCXBNMzr1xdCmQ/edit#gid=1148196142
   *
   * @param questions
   * @param filters
   *
   * @return Array arrays of arrays for all the 4 sheets as mentioned in sample
   */
  private parseQuestionsForXslxForm(
    questions,
    filters: GenerateFormDto,
  ): Array<any> {
    const surveySheetHeader = [
      'type',
      'name',
      'label',
      'required',
      'constraint',
      'constraint_message',
      'hint',
      'relevant',
      'choice_filter',
      'appearance',
      'calculation',
      'image',
    ];
    const choicesSheetHeader = ['list name', 'name', 'label'];
    const settingsSheetHeader = [
      'form_title',
      'form_id',
      'allow_choice_duplicates',
    ];
    let surveySheetArray = [surveySheetHeader];
    const choicesSheetArray = [choicesSheetHeader];
    const settingsSheetArray = [settingsSheetHeader];
    let name =
      filters.boards[0] + '_' + filters.grades[0] + '_' + filters.subjects[0];
    name = name.replace(' ', '_').toLowerCase();
    surveySheetArray.push([
      'begin group',
      name,
      'नीचे दिए गए अनुच्छेद/प्रश्न को विद्यार्थी द्वारा पढ़कर उस पर आधारित प्रश्नों का उत्तर दिया जाना है। \n' +
        '\n' +
        'इस प्रक्रिया में मेंटर्स विद्यार्थियों को केवल प्रश्न समझने में सहयोग करेंगे। विद्यार्थी द्वारा बताये गए उत्तर को ऐप में मेंटर को ही अंकित करना होगा।',
      '',
      '',
      '',
      '',
      '',
      '',
      'field-list',
      '',
      '',
    ]);
    let index = 1;
    const totalMarksCellArray = [];
    const optionsMap = ['a', 'b', 'c', 'd'];
    const optionRowsArray = [];
    questions.result.questions.forEach((question) => {
      const itemName = 'ques_' + filters.subjects[0] + '_' + index;
      const itemType = 'select_one ' + itemName;
      const itemLabel = question.editorState.question;
      const itemRequired = 'yes';
      const itemConstraint = '';
      const itemConstraintMessage = '';
      const itemHint = '';
      const itemRelevant = '';
      const itemChoiceFilter = '';
      const itemAppearance = '';
      const itemCalculation = '';
      const itemImage = ''; // todo set for image
      surveySheetArray.push([
        itemType,
        itemName,
        itemLabel,
        itemRequired,
        itemConstraint,
        itemConstraintMessage,
        itemHint,
        itemRelevant,
        itemChoiceFilter,
        itemAppearance,
        itemCalculation,
        itemImage,
      ]);

      // prepare `calculation` column string & push to $optionRows; we'll merge this to $surveySheetArray later
      let correctOption = '';
      for (let i = 0; i < question.editorState.options.length; i++) {
        const option = question.editorState.options[i];
        if (option.answer) {
          correctOption = optionsMap[i];
        }
        choicesSheetArray.push([itemName, optionsMap[i], option.value.body]); // populate choices sheet
      }
      const optionItemName = itemName + '_ans';
      totalMarksCellArray.push('${' + optionItemName + '}');
      optionRowsArray.push([
        'calculate',
        optionItemName,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'if(${' + itemName + '} = ‘' + correctOption + "‘, '1', '0')",
        '',
      ]);

      index++; // at last increment the index
    }); // forEach() ends

    surveySheetArray.push([
      'end group',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);

    surveySheetArray = surveySheetArray.concat(optionRowsArray);

    // push hidden `total_marks` row to $optionRows
    surveySheetArray.push([
      'calculate',
      'total_marks',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      totalMarksCellArray.join(' + '),
      '',
    ]);

    // push the remaining rows
    surveySheetArray = surveySheetArray.concat([
      [
        'hidden',
        'ques_number',
        questions.result.questions.length,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
      [
        'hidden',
        'total_ques',
        'कुल प्रश्न = ' + questions.result.questions.length,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
      [
        'hidden',
        'total_correct',
        'कुल प्रश्न जिसका सही उत्तर दिया ${total_marks}',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
      ['start', 'start', '', '', '', '', '', '', '', '', '', ''],
      ['end', 'end', '', '', '', '', '', '', '', '', '', ''],
      ['today', 'today', '', '', '', '', '', '', '', '', '', ''],
    ]);

    settingsSheetArray.push([name, 'g2m_w1', 'no']);

    return [surveySheetArray, choicesSheetArray, [], settingsSheetArray];
  }

  /**
   * Returns the absolute path of the .xlsx file created
   * @param surveySheetArray
   * @param choicesSheetArray
   * @param mediaSheetArray
   * @param settingsSheetArray
   *
   * @return string file (absolute path of the generated XSLX form)
   */
  private createXslx(
    surveySheetArray: Array<any>,
    choicesSheetArray: Array<any>,
    mediaSheetArray: Array<any>,
    settingsSheetArray: Array<any>,
  ): string {
    const filename = +new Date() + '.xlsx';
    const file = this.config.xlsxFilesPath + '/' + filename;

    const workbook = XLSX.utils.book_new();
    const surveySheet = XLSX.utils.aoa_to_sheet(surveySheetArray);
    const choicesSheet = XLSX.utils.aoa_to_sheet(choicesSheetArray);
    const mediaSheet = XLSX.utils.aoa_to_sheet(mediaSheetArray);
    const settingsSheet = XLSX.utils.aoa_to_sheet(settingsSheetArray);
    XLSX.utils.book_append_sheet(workbook, surveySheet, 'survey');
    XLSX.utils.book_append_sheet(workbook, choicesSheet, 'choices');
    XLSX.utils.book_append_sheet(workbook, mediaSheet, 'media');
    XLSX.utils.book_append_sheet(workbook, settingsSheet, 'settings');
    XLSX.writeFileXLSX(workbook, file, { bookType: 'xlsx', type: 'file' });

    return file;
  }
}
