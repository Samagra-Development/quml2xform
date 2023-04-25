import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { QumlToOdkService } from "./quml-to-odk.service";

@Injectable()
export class DataService extends QumlToOdkService {
  async fetchAllJson(boards: string[], qType: string, limit: number, offset: number): Promise<any> {
    const url = this.questionBankUrl;
    let allResults = [];
    const finalQuestions = [];
    let totalResults = 0;
    let requestOffset = offset;

    try {
      do {
        const data = {
          request: {
            filters: {
              se_boards: boards,
              qType: qType,
            },
            limit: limit,
            offset: requestOffset,
          },
        };
        const response = await axios.post(url, data, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const currentResults = response.data.result.Question;
        const currentQuestions = [];
        currentResults.map((question) => {
          return currentQuestions.push(question.identifier);
        });
        allResults = allResults.concat(currentResults);
        const questionDetails = await this.fetchQuestionDetails(currentQuestions);
        questionDetails['result']['questions'].map((item) => {
          let correctOption = 0;
          item.editorState.options.map((item, index) => {
            if (item.answer) {
              correctOption = index+1;
            }
          });
          // console.log('item.gradeLevel.length', item?.gradeLevel?.length);
          // console.log('item.subject?.length', item?.subject?.length);
          // console.log('item.se_topics?.length', item?.se_topics?.length);
          // console.log('item.learningOutcome?.length', item?.learningOutcome?.length);
          // console.log('item.editorState.options.length', item.editorState.options.length);
          // console.log(item.editorState.options);
          // console.log('Option1:', item.editorState.options.length == 1 ? item.editorState.options[0].value.body : '');
          //   console.log('Option2:', item.editorState.options.length == 2 ? item.editorState.options[1].value.body : '');
          //   console.log('Option3:', item.editorState.options.length == 3 ? item.editorState.options[2].value.body : '');
          //   console.log('Option4:', item.editorState.options.length == 4 ? item.editorState.options[3].value.body : '');

          finalQuestions.push({
            'Project Name': '',
            'Project ID': item.programId,
            'Class': item?.gradeLevel?.length ? item.gradeLevel[0] : '',
            'Subject': item?.subject?.length ? item.subject[0] : '',
            'Question': item.body,
            'Option1': item.editorState.options.length >= 1 ? item.editorState.options[0].value.body : '',
            'Option2': item.editorState.options.length >= 2 ? item.editorState.options[1].value.body : '',
            'Option3': item.editorState.options.length >= 3 ? item.editorState.options[2].value.body : '',
            'Option4': item.editorState.options.length >= 4 ? item.editorState.options[3].value.body : '',
            'Correct Option': correctOption,
            'Topic/Chapter': item?.se_topics?.length ? item?.se_topics[0] : '',
            'Competency': item?.learningOutcome?.length ? item?.learningOutcome[0] : '',
            'Competency Code': '',
            'Skill': '',
            'Count': ''
          });
        });

        totalResults = response.data.result.count;
        if (response.data.result.count < allResults.length + limit) {
          requestOffset = response.data.result.count - allResults.length;
        } else {
          requestOffset += currentResults.length;
        }
        this.logger.log(response.data.result.count, allResults.length, requestOffset);
      } while (allResults.length < totalResults);
    } catch (e) {
      this.logger.error(e);
      console.log(e);
    }

    return finalQuestions;
  }
}
