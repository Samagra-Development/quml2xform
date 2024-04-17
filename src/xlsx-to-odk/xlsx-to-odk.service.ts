import {
  Inject,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import AdmZip = require('adm-zip');
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
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

  private async _processZipAndUploadToODK(filePath: string, fileName: string) {
   const targetPath: string = './gen/zip/extracted/' + fileName;
   const inputFile = targetPath + '/form.xlsx';
   const odkFormFile = targetPath + '/form.xml';
   try {
     /*
    This function takes in a zip file, processes it, and uploads to ODK
    */
    this.logger.log('Processing zip file..');
    const zip = new AdmZip(filePath);
    if (!zip.test()) {
      this.logger.error('Invalid zip uploaded.');
      throw new UnprocessableEntityException('Not a valid zip file.');
    }

    zip.extractAllTo(targetPath, true);
    this.logger.log(`Zip extracted to: ${targetPath}`);

    const formImageFiles: Array<string> = [];
    zip.forEach((zipEntry) => {
      if (zipEntry.name != '' && zipEntry.entryName.includes('images/')) {
        // it's an image
        formImageFiles.push(targetPath + '/' + zipEntry.entryName);
      }
    });

    const convertRes = await this.appService.convertExcelToOdkForm(
      inputFile,
      odkFormFile,
    );
    if (!convertRes) {
      return {
        xlsxFile: inputFile,
        odkFile: odkFormFile,
        error: true,
        errorMsg:
          'Error converting Excel to ODK Form - please validate the input file',
      };
    }

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
        formId =
          formUploadResponse?.data?.formID || formUploadResponse?.formID || '';
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
  } catch (error) {
    this.logger.error('Error converting Excel to ODK Form:', error);
    return {
      xlsxFile: inputFile,
      odkFile: odkFormFile,
      error: true,
      errorMsg: error.message || 'Error converting Excel to ODK Form',
    };
  }
 }

  public async xslxToOdk(
    filePath: string,
    fileName: string,
    bulkUpload = false,
  ) {
    const results = [];
    if (!bulkUpload) {
      results.push(await this._processZipAndUploadToODK(filePath, fileName));
      return results;
    }
    this.logger.log('Unzipping bulk uploaded zip files..');
    const zip = new AdmZip(filePath);
    if (!zip.test()) {
      this.logger.error('Invalid bulk zip uploaded.');
      throw new UnprocessableEntityException('Not a valid bullk zip file.');
    }

    const targetPath: string = './gen/zip/extracted/' + fileName;
    zip.extractAllTo(targetPath, true);
    this.logger.log(`Bulk Zip extracted to: ${targetPath}`);
    const promises = [];
    for (const zipEntry of zip.getEntries()) {
      const fileName = zipEntry.entryName;
      const childZipFilePath = path.join(targetPath, zipEntry.entryName);
      const makePathSafe = (inputString) =>
        inputString.replace(/[\/\\:*?"<>| ()]/g, '');

      const fileLastName = fileName.split('/').pop();
      if (
        zipEntry.isDirectory ||
        !fileLastName ||
        fileLastName.startsWith('.')
      ) {
        this.logger.debug(`Skipping directory/file: ${fileName}`);
        continue; // Skip processing directories, hidden files and system files
      }

      // Process and upload to ODK, and store the promise in the array
      promises.push(
      this._processZipAndUploadToODK(
        childZipFilePath,
        makePathSafe(fileName + Date.now()),
      ));
    }

    // Wait for all promises to resolve
    return await Promise.all(promises);
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
        result['formId'] = uploadResponse[0].formId;
        result['error'] = uploadResponse[0].errorMsg;
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
