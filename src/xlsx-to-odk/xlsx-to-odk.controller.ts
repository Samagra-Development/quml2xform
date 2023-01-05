import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { XlsxToOdkService } from './xlsx-to-odk.service';

@Controller()
export class XlsxToOdkController {
  constructor(private readonly service: XlsxToOdkService) {}

  @Post('xslx-to-odk')
  @UseInterceptors(FileInterceptor('file', { dest: './gen/zip/uploaded' }))
  xslxToOdk(@UploadedFile() file: Express.Multer.File) {
    return this.service.xslxToOdk(file.path, file.filename);
  }

  @Post('xslx-to-odk/via-json')
  xslxToOdkViaJson(@Body() body) {
    return this.service.xslxToOdkViaJson(body);
  }
}
