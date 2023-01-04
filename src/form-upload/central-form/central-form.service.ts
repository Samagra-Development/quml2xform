import { Injectable, Logger } from '@nestjs/common';
import { FormUploadInterface } from '../form-upload.interface';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { FormUploadStatus } from '../form.types';
import { ODK as ODKMessages } from '../messages';
import fetch from 'node-fetch';

@Injectable()
export class CentralFormService implements FormUploadInterface {
  ODK_FORM_UPLOAD_URL: string;
  TOKEN: string;

  protected readonly logger = new Logger(CentralFormService.name); // logger instance

  constructor(private configService: ConfigService) {
    this.logger.log('ODK Central Service initialised..');
    console.log('ODK Central Service initialised..');
    this.ODK_FORM_UPLOAD_URL = `${this.configService.get<string>(
      'ODK_BASE_URL',
    )}/v1/projects/${this.configService.get<string>(
      'ODK_CENTRAL_PROJECT',
    )}/forms`;

    const tokenString = `${this.configService.get<string>(
      'ODK_USERNAME',
    )}:${this.configService.get<string>('ODK_PASSWORD')}`;
    this.TOKEN = Buffer.from(tokenString, 'utf8').toString('base64');
  }

  login() {
    // some logic
  }

  async uploadForm(
    formFilePath: string,
    imagesFilePaths: string[],
  ): Promise<FormUploadStatus> {
    const xml = fs.readFileSync(formFilePath).toString();

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        Authorization: `Basic ${this.TOKEN}`,
      },
      body: xml,
      timeout: 10000,
    };
    try {
      const url = imagesFilePaths.length
        ? `${this.ODK_FORM_UPLOAD_URL}?publish=false`
        : `${this.ODK_FORM_UPLOAD_URL}?publish=true`;
      const response = await fetch(url, requestOptions);
      const result = JSON.parse(await response.text());
      if (response.status !== 200) {
        const checkPoint = 'CP-1' + ` (${result.code})`;
        return {
          status: 'ERROR',
          errorCode: ODKMessages.UPLOAD.EXCEPTION_CODE + '-' + checkPoint,
          errorMessage: result.message,
          data: {},
        };
      }
      const formUploadResponse: FormUploadStatus = {
        status: 'UPLOADED',
        data: {
          formID: result.xmlFormId,
        },
      };
      this.logger.log(`Form uploaded successfully.. ${JSON.stringify(result)}`);

      try {
        // Upload all the media
        imagesFilePaths.map(async (path) => {
          this.logger.log(`Uploading image.. ${path}`);
          const filename = path.split('/').slice(-1)[0];
          const imageUploadResponse = await fetch(
            `${this.ODK_FORM_UPLOAD_URL}/${result.xmlFormId}/draft/attachments/${filename}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Basic ${this.TOKEN}`,
                'Content-Type': '*/*',
              },
              body: fs.readFileSync(path),
              redirect: 'follow',
            },
          );
          await imageUploadResponse.text();
          if (imageUploadResponse.status !== 200) {
            throw new Error('Image Upload failed!!!');
          }
        });

        // images uploaded successfully; let's publish the form now.
        this.logger.log(`Publishing form..`);
        this.logger.log(
          `${this.ODK_FORM_UPLOAD_URL}/${result.xmlFormId}/draft/publish?version=${result.version}`,
        );
        const formPublishResponse = await fetch(
          `${this.ODK_FORM_UPLOAD_URL}/${result.xmlFormId}/draft/publish?version=${result.version}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${this.TOKEN}`,
            },
          },
        );
        this.logger.log(
          `Form publish response - ${await formPublishResponse.text()}`,
        );
        if (formPublishResponse.status !== 200) {
          // noinspection ExceptionCaughtLocallyJS
          throw new Error('Form publish failed!!!');
        }
      } catch (e) {
        this.logger.error(e);
        const checkPoint = 'CP-3';
        return {
          status: 'ERROR',
          errorCode: ODKMessages.UPLOAD.EXCEPTION_CODE + '-' + checkPoint,
          errorMessage: e.toString(),
          data: {},
        };
      }
      return formUploadResponse;
    } catch (e) {
      this.logger.error(e);
      const checkPoint = 'CP-2';
      return {
        status: 'ERROR',
        errorCode: ODKMessages.UPLOAD.EXCEPTION_CODE + '-' + checkPoint,
        errorMessage: e.toString(),
        data: {},
      };
    }
  }
}
