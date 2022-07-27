import { GenerateFormDto } from '../dto/generate-form.dto';
import { QumlToOdkService } from '../quml-to-odk.service';
import * as XLSX from 'xlsx';

export class McqParser {
  /**
   * Prepares the XSLX form sheets data as per the provided template file: https://docs.google.com/spreadsheets/d/1GIcHghGYUR1FZ31BD-LCXBNMzr1xdCmQ/edit#gid=1148196142
   *
   * @param questions
   * @param filters
   *
   * @return Array arrays of arrays for all the 4 sheets as mentioned in sample
   */
  private parseQuestions(questions, filters: GenerateFormDto): Array<any> {
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
      const itemName = (
        'ques_' +
        filters.subjects[0] +
        '_' +
        index
      ).toLowerCase();
      const itemType = 'select_one ' + itemName;
      const itemLabel = QumlToOdkService.cleanHtml(
        question.editorState.question,
      );
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
        choicesSheetArray.push([
          itemName,
          optionsMap[i],
          QumlToOdkService.cleanHtml(option.value.body),
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
   * @param questions
   * @param filters
   * @param filepath
   * @return string file (absolute path of the generated XSLX form)
   */
  public createForm(
    questions,
    filters: GenerateFormDto,
    filepath: string,
  ): string {
    const data = this.parseQuestions(questions, filters);
    const surveySheetArray = data[0];
    const choicesSheetArray = data[1];
    const mediaSheetArray = data[2];
    const settingsSheetArray = data[3];

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

    return filepath;
  }
}