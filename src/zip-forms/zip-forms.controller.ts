import { Controller, NotFoundException, Post, Response, UnsupportedMediaTypeException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ZipFormsService } from './zip-forms.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response as ApiResponse } from 'express';

@Controller('zip-forms')
export class ZipFormsController {
  constructor(private readonly zipFormsService: ZipFormsService) {}

  
  @Post(`update/form-id`)
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/zip') {
          return cb(
            new UnsupportedMediaTypeException(
              'Invalid file type. Only ZIP files are allowed',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async updateZipsFormsIds(
    @UploadedFile() file: Express.Multer.File,
    @Response() res: ApiResponse,
  ) {
    if (!file) {
      throw new NotFoundException('File not uploaded');
    }
    const fileName = file.originalname;

    const response = await this.zipFormsService.modifyZipsExcelSheet(
      file.buffer,
    );

    // Set response headers
    res.header({
      'Content-Disposition': `attachment; filename=${fileName}`,
      'Content-Type': 'application/zip',
    });

    res.send(response);
  }
}

