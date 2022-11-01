import { GenerateFormDto } from '../dto/generate-form.dto';
import { QumlToOdkService } from '../quml-to-odk.service';
import * as XLSX from 'xlsx';

export class McqParser {
  constructor(private readonly service: QumlToOdkService) {}

  /**
   * Prepares the XSLX form sheets data as per the provided template file: https://docs.google.com/spreadsheets/d/1GIcHghGYUR1FZ31BD-LCXBNMzr1xdCmQ/edit#gid=1148196142
   *
   * @param questions
   * @param filters
   *
   * @return Array arrays of arrays for all the 4 sheets as mentioned in sample
   */
  private async parseQuestions(
    questions,
    filters: GenerateFormDto,
  ): Promise<Array<any>> {
    const imagePathsArray = [];
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
      'media::image',
    ];
    const choicesSheetHeader = ['list name', 'name', 'label', 'media::image'];
    const settingsSheetHeader = [
      'form_title',
      'form_id',
      'allow_choice_duplicates',
      'version',
    ];
    let surveySheetArray = [surveySheetHeader];
    const choicesSheetArray = [choicesSheetHeader];
    const settingsSheetArray = [settingsSheetHeader];
    let name = filters.board + '_' + filters.grade + '_' + filters.subject;
    name = name
      .replace(/[^a-zA-Z0-9\\s]/g, '_') // remove any white space
      .toLowerCase();
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
    for (const question of questions) {
      const itemName = (
        'ques_' +
        filters.subject.replace(/[^a-zA-Z0-9\\s]/g, '_') +
        '_' +
        index
      ).toLowerCase();
      const itemType = 'select_one ' + itemName;
      let itemLabel = QumlToOdkService.cleanHtml(question.editorState.question);
      if (itemLabel === '') {
        // if empty, put a dot
        itemLabel = '.';
      }
      const itemRequired = 'yes';
      const itemConstraint = '';
      const itemConstraintMessage = '';
      const itemHint = '';
      const itemRelevant = '';
      const itemChoiceFilter = '';
      const itemAppearance = '';
      const itemCalculation = '';
      let itemImage = '';

      // checking if there is an image in option
      let questionImage;
      if (
        (questionImage = QumlToOdkService.findImageFromBody(
          question.editorState.question,
        )) !== null
      ) {
        const questionImageObject = this.service.saveImage(questionImage);
        if (questionImageObject.path) {
          imagePathsArray.push(questionImageObject.path); // push the path in array
          itemImage = questionImageObject.name;
        }
      }

      // checking if there are table(s) in the question body, we replace them with images
      let questionTables: string[];
      if (
        (questionTables = QumlToOdkService.findTablesFromHtml(
          question.editorState.question,
        )).length
      ) {
        const questionTableImagePath = await this.service.htmlTableToImage(
          questionTables.join('<br>'),
        );
        itemImage = questionTableImagePath.split('/').slice(-1)[0];
        imagePathsArray.push(questionTableImagePath); // push to array for upload
      }

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
        // checking if there is an image in option
        let optionImage = '';
        if (
          (optionImage = QumlToOdkService.findImageFromBody(
            option.value.body,
          )) !== null
        ) {
          const optionImageObject = this.service.saveImage(optionImage);
          if (optionImageObject.path) {
            imagePathsArray.push(optionImageObject.path); // push the path in array
            optionImage = optionImageObject.name;
          }
        }

        // checking if there are table(s) in the option body, we replace them with images
        let optionTables = [];
        if (
          (optionTables = QumlToOdkService.findTablesFromHtml(
            option.value.body,
          )).length
        ) {
          const optionTableImagePath = await this.service.htmlTableToImage(
            optionTables.join('<br>'),
          );
          itemImage = optionTableImagePath.split('/').slice(-1)[0];
          imagePathsArray.push(optionTableImagePath); // push to array for upload
        }

        choicesSheetArray.push([
          itemName,
          optionsMap[i],
          QumlToOdkService.cleanHtml(option.value.body),
          optionImage,
        ]); // populate choices sheet
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
    } // for() ends

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
        questions.length,
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
        'कुल प्रश्न = ' + questions.length,
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

    /**
     * Form ID logic: Grade_<grade_value>Subject<subject_name>_<serial_number>
     *   where serial_number === current date_hour_minute
     *   e.g. Class_6_Mathematics_297202220428
     */
    let formId =
      filters.grade.replace(/[^a-zA-Z0-9\\s]/g, '_') +
      '_' +
      filters.subject.replace(/[^a-zA-Z0-9\\s]/g, '_');
    console.log(formId);
    const currDate = new Date().toLocaleString();
    formId =
      formId.toLowerCase() +
      '_' +
      currDate
        .replace(/[^a-zA-Z0-9\\s]/g, '') // remove any white space
        .replace(':', '')
        .replace('pm', '')
        .replace('PM', '')
        .replace('AM', '')
        .replace('am', '')
        .toLowerCase();
    settingsSheetArray.push([
      name,
      formId,
      'no',
      Math.floor(Date.now() / 1000).toString(),
    ]);

    return [
      surveySheetArray,
      choicesSheetArray,
      [],
      settingsSheetArray,
      imagePathsArray,
    ];
  }

  /**
   * Returns the absolute path of the .xlsx file created
   * @param questions
   * @param filters
   * @param filepath
   * @return string file (absolute path of the generated XSLX form)
   */
  public async createForm(
    questions,
    filters: GenerateFormDto,
    filepath: string,
  ): Promise<Array<string>> {
    const data = await this.parseQuestions(questions, filters);
    const surveySheetArray = data[0];
    const choicesSheetArray = data[1];
    const mediaSheetArray = data[2];
    const settingsSheetArray = data[3];
    const imagesArray = data[4];

    const workbook = XLSX.utils.book_new();
    const surveySheet = XLSX.utils.aoa_to_sheet(surveySheetArray);
    const choicesSheet = XLSX.utils.aoa_to_sheet(choicesSheetArray);
    const mediaSheet = XLSX.utils.aoa_to_sheet(mediaSheetArray);
    const settingsSheet = XLSX.utils.aoa_to_sheet(settingsSheetArray);
    XLSX.utils.book_append_sheet(workbook, surveySheet, 'survey');
    XLSX.utils.book_append_sheet(workbook, choicesSheet, 'choices');
    XLSX.utils.book_append_sheet(workbook, mediaSheet, 'media');
    XLSX.utils.book_append_sheet(workbook, settingsSheet, 'settings');
    XLSX.writeFileXLSX(workbook, filepath, { bookType: 'xlsx', type: 'file' });

    return [filepath, imagesArray];
  }
}
