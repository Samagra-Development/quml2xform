import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('xslx-to-odk')
  @UseInterceptors(FileInterceptor('file', { dest: './gen/zip/uploaded' }))
  xslxToOdk(@UploadedFile() file: Express.Multer.File) {
    return this.appService.xslxToOdk(file.path, file.filename);
  }

  @Post('xslx-to-odk/via-json')
  xslxToOdkViaJson(@Body() body) {
    return this.appService.xslxToOdkViaJson(body);
  }
}
