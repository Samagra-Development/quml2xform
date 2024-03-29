import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import digestAuthRequest from './digestAuthRequest';
import { ODK as ODKMessages } from './messages';
import { FormUploadStatus } from './form.types';
import { FormUploadInterface } from './form-upload.interface';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FormData = require('form-data');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

/**
 * The service codes taken from here: https://github.com/samagra-comms/uci-apis/blob/v2/v2/uci/src/modules/form/form.service.ts
 */
@Injectable()
export class FormService implements FormUploadInterface {
  odkClient: any;
  ODK_FILTER_URL: string;
  ODK_FORM_UPLOAD_URL: string;
  TRANSFORMER_BASE_URL: string;

  protected readonly logger = new Logger(FormService.name); // logger instance

  constructor(private configService: ConfigService) {
    this.logger.log('ODK Aggregate Service initialised..');
    console.log('ODK Aggregate Service initialised..');
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

  async uploadForm(
    formFilePath: string,
    imagesFilePaths: string[],
  ): Promise<FormUploadStatus> {
    //TODO: Check total size of images + file should be less than 10MB
    const filename = (formFilePath) => formFilePath.split('/').slice(-1)[0];
    return new Promise((resolve, reject) => {
      this.odkClient.request(
        async function (data): Promise<FormUploadStatus> {
          const formData = new FormData();
          const file = fs.createReadStream(formFilePath);

          // Add file
          formData.append('form_def_file', file, filename(formFilePath));

          // Add images
          if (imagesFilePaths.length > 0) {
            for (let i = 0; i < imagesFilePaths.length; i++) {
              const imageFile = fs.createReadStream(imagesFilePaths[i]);
              formData.append(
                'mediaFiles',
                imageFile,
                filename(imagesFilePaths[i]),
              );
            }
          }
          const requestOptions = {
            method: 'POST',
            headers: {
              Cookie: data.cookie,
            },
            body: formData,
            timeout: 10000,
          };
          try {
            const response = await fetch(
              this.extras.ODK_FORM_UPLOAD_URL,
              requestOptions,
            );
            const result = await response.text();
            if (result.includes('Successful form upload.')) {
              const data = fs.readFileSync(formFilePath);
              try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const parser = require('xml2json');
                const formDef = JSON.parse(parser.toJson(data.toString()));
                let formID: string;
                if (Array.isArray(formDef['h:html']['h:head'].model.instance)) {
                  formID =
                    formDef['h:html']['h:head'].model.instance[0].data.id;
                } else {
                  formID = formDef['h:html']['h:head'].model.instance.data.id;
                }
                resolve({
                  status: 'UPLOADED',
                  data: {
                    formID,
                  },
                });
                return;
              } catch (e) {
                console.log(e);
                const checkPoint = 'CP-1';
                reject({
                  status: 'ERROR',
                  errorCode:
                    ODKMessages.UPLOAD.EXCEPTION_CODE + '-' + checkPoint,
                  errorMessage: ODKMessages.UPLOAD.UPLOAD_FAIL_MESSAGE,
                  data: {},
                });
                return;
              }
            } else {
              const checkPoint = 'CP-2';
              console.log(result);
              reject({
                status: 'ERROR',
                errorCode: ODKMessages.UPLOAD.EXCEPTION_CODE + '-' + checkPoint,
                errorMessage: ODKMessages.UPLOAD.UPLOAD_FAIL_MESSAGE,
                data: {},
              });
            }
          } catch (error) {
            console.log(error);
            const checkPoint = 'CP-3';
            reject({
              status: 'ERROR',
              errorCode: ODKMessages.UPLOAD.EXCEPTION_CODE + '-' + checkPoint,
              errorMessage: ODKMessages.UPLOAD.UPLOAD_FAIL_MESSAGE,
              data: {},
            });
          }
        },
        function (errorCode): FormUploadStatus {
          console.log('My error..');
          console.log({ errorCode });
          const checkPoint = 'CP-4';
          reject({
            status: 'ERROR',
            errorCode: ODKMessages.UPLOAD.EXCEPTION_CODE + '-' + checkPoint,
            errorMessage: ODKMessages.UPLOAD.UPLOAD_FAIL_MESSAGE,
            data: {},
          });
          return;
        },
        null,
        this,
      );
    });
  }
}
