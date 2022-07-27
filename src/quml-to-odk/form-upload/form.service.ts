import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import digestAuthRequest from './digestAuthRequest';
import { ODK as ODKMessages, PROGRAM as ProgramMessages } from './messages';
import parser from 'xml2json';
import { FormUploadStatus } from './form.types';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FormData = require('form-data');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

/**
 * The service codes taken from here: https://github.com/samagra-comms/uci-apis/blob/v2/v2/uci/src/modules/form/form.service.ts
 */
@Injectable()
export class FormService {
  odkClient: any;
  ODK_FILTER_URL: string;
  ODK_FORM_UPLOAD_URL: string;
  TRANSFORMER_BASE_URL: string;
  errCode =
    ProgramMessages.EXCEPTION_CODE + '_' + ODKMessages.UPLOAD.EXCEPTION_CODE;

  constructor(private configService: ConfigService) {
    this.ODK_FILTER_URL = `${this.configService.get<string>(
      'ODK_BASE_URL',
    )}/Aggregate.html#submissions/filter///`;
    this.ODK_FORM_UPLOAD_URL = `${this.configService.get<string>(
      'ODK_BASE_URL',
    )}/formUpload`;
    this.TRANSFORMER_BASE_URL = `${this.configService.get<string>(
      'TRANSFORMER_BASE_URL',
    )}`;

    this.odkClient = new digestAuthRequest(
      'GET',
      this.ODK_FILTER_URL,
      this.configService.get<string>('ODK_USERNAME'),
      this.configService.get<string>('ODK_PASSWORD'),
      {
        timeout: 30000,
        loggingOn: false,
      },
    );
    this.login(); //first time login
  }

  async login() {
    this.odkClient.request(
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      () => {},
      null,
      this,
    );
  }

  async uploadForm(formFilePath: string): Promise<FormUploadStatus> {
    const filename = formFilePath.split('/').slice(-1)[0];
    return this.odkClient.request(
      async function (data): Promise<FormUploadStatus> {
        const formData = new FormData();
        const file = fs.createReadStream(formFilePath);
        formData.append('form_def_file', file, filename);
        const requestOptions = {
          method: 'POST',
          headers: {
            Cookie: data.cookie,
          },
          body: formData,
        };
        return await fetch(this.extras.ODK_FORM_UPLOAD_URL, requestOptions)
          .then((response) => response.text())
          .then(async (result): Promise<FormUploadStatus> => {
            if (result.includes('Successful form upload.')) {
              // below snippet is not needed to be called
              /*await fetch(this.extras.TRANSFORMER_BASE_URL)
                .then(console.log)
                .catch(console.log);*/
              const data = fs.readFileSync(formFilePath);
              try {
                const formDef = JSON.parse(parser.toJson(data.toString()));
                let formID: string;
                if (Array.isArray(formDef['h:html']['h:head'].model.instance)) {
                  formID =
                    formDef['h:html']['h:head'].model.instance[0].data.id;
                } else {
                  formID = formDef['h:html']['h:head'].model.instance.data.id;
                }
                return {
                  status: 'UPLOADED',
                  data: {
                    formID,
                  },
                };
              } catch (e) {
                const checkPoint = 'CP-1';
                return {
                  status: 'ERROR',
                  errorCode:
                    ODKMessages.UPLOAD.EXCEPTION_CODE + '-' + checkPoint,
                  errorMessage: ODKMessages.UPLOAD.UPLOAD_FAIL_MESSAGE,
                  data: {},
                };
              }
            } else {
              const checkPoint = 'CP-2';
              return {
                status: 'ERROR',
                errorCode: ODKMessages.UPLOAD.EXCEPTION_CODE + '-' + checkPoint,
                errorMessage: ODKMessages.UPLOAD.UPLOAD_FAIL_MESSAGE,
                data: {},
              };
            }
          })
          .catch((error) => {
            console.log({ error });
            const checkPoint = 'CP-3';
            return {
              status: 'ERROR',
              errorCode: ODKMessages.UPLOAD.EXCEPTION_CODE + '-' + checkPoint,
              errorMessage: ODKMessages.UPLOAD.UPLOAD_FAIL_MESSAGE,
              data: {},
            };
          });
      },
      function (errorCode): FormUploadStatus {
        console.log({ errorCode });
        const checkPoint = 'CP-4';
        return {
          status: 'ERROR',
          errorCode: ODKMessages.UPLOAD.EXCEPTION_CODE + '-' + checkPoint,
          errorMessage: ODKMessages.UPLOAD.UPLOAD_FAIL_MESSAGE,
          data: {},
        };
      },
      null,
      this,
    );
  }
}