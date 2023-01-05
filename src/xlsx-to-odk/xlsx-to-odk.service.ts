import {
  Inject,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import AdmZip = require('adm-zip');
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { FormUploadServiceToken } from '../form-upload/form.types';
import { FormUploadInterface } from '../form-upload/form-upload.interface';
import { AppService } from '../app.service';

@Injectable()
export class XlsxToOdkService {
  protected readonly logger = new Logger(XlsxToOdkService.name); // logger instance

  private readonly uploadFormsToAggregate: boolean;
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(FormUploadServiceToken)
    private readonly formService: FormUploadInterface,
    private readonly appService: AppService,
  ) {
    this.uploadFormsToAggregate =
      configService.get<string>('UPLOAD_FORMS', 'FALSE') === 'TRUE';
  }

  public async xslxToOdk(filePath: string, fileName: string) {
    this.logger.log('Processing zip file..');
    const zip = new AdmZip(filePath);
    if (!zip.test()) {
      this.logger.error('Invalid zip uploaded.');
      throw new UnprocessableEntityException('Not a valid zip file.');
    }

    const targetPath: string = './gen/zip/extracted/' + fileName;
    zip.extractAllTo(targetPath, true);
    this.logger.log(`Zip extracted to: ${targetPath}`);

    const formImageFiles: Array<string> = [];
    zip.forEach((zipEntry) => {
      if (zipEntry.name != '' && zipEntry.entryName.includes('images/')) {
        // it's an image
        formImageFiles.push(targetPath + '/' + zipEntry.entryName);
      }
    });

    const inputFile = targetPath + '/form.xlsx';
    const odkFormFile = targetPath + '/form.xml';
    await this.appService.convertExcelToOdkForm(inputFile, odkFormFile);
    this.logger.log(`XML file generated & stored at: ${odkFormFile}`);

    let formId = '';
    let error = false;
    let errorMsg = '';
    if (this.uploadFormsToAggregate) {
      // if form upload to aggregate allowed
      this.logger.debug(`Uploading form.. Image files:`, formImageFiles);
      const formUploadResponse = await this.formService.uploadForm(
        odkFormFile,
        formImageFiles,
      );
      if (
        formUploadResponse &&
        formUploadResponse.status &&
        formUploadResponse.status === 'UPLOADED'
      ) {
        //
      } else {
        console.log(formUploadResponse);
        error = true;
        errorMsg = formUploadResponse.errorMessage;
        formId = formUploadResponse?.data?.formID || formUploadResponse?.formID || '';
        this.logger.error(
          `Form Upload error..`,
          JSON.stringify(formUploadResponse),
        );
      }
    }
    return {
      xlsxFile: inputFile,
      odkFile: odkFormFile,
      formId: formId,
      error: error,
      errorMsg: errorMsg,
    };
  }

  public async xslxToOdkViaJson(
    body: Array<{
      url: string;
      grade: number;
      subject: string;
    }>,
  ) {
    const uploadResponse: Array<{
      url: string;
      grade: number;
      subject: string;
      formId: string;
      error: string;
    }> = [];
    for (const item of body) {
      const result = item;
      this.logger.log(`Processing: ${JSON.stringify(item)}...`);
      const fileName = uuid() + '.zip';
      const targetPath: string = './gen/zip/uploaded/' + fileName;
      const writer = fs.createWriteStream(targetPath);

      const response = await this.httpService.axiosRef({
        url: item.url,
        method: 'GET',
        responseType: 'stream',
        responseEncoding: '7bit',
      });

      await new Promise((resolve, reject) => {
        response.data.pipe(writer);
        let error = null;
        writer.on('error', (err) => {
          error = err;
          writer.close();
          reject(err);
        });

        writer.on('close', () => {
          this.logger.log(
            `File downloaded from URL & saved at ${targetPath}. Processing file...`,
          );
          if (!error) {
            resolve('File saved!');
          }
        });
      });

      try {
        const uploadResponse = await this.xslxToOdk(targetPath, fileName);
        result['formId'] = uploadResponse.formId;
        result['error'] = uploadResponse.errorMsg;
      } catch (e) {
        result['error'] = e.toString();
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      uploadResponse.push(result);
    }

    return uploadResponse;
  }
}
