import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as JSZip from 'jszip';

@Injectable()
export class ZipFormsService {
  protected readonly logger = new Logger(ZipFormsService.name);

  constructor() {}

  async modifyZipsExcelSheet(buffer: Buffer): Promise<any> {
    // Unzip the provided buffer to extract Excel file content and filename
    const unzipResponse = await this.unzipFile(buffer);

    for (const response of unzipResponse) {
      let { fileBuffer, fileName } = response;

      // Update the Excel sheet content
      fileBuffer = await this.updateExcelSheet(fileBuffer, fileName);

      // Update the fileBuffer in the unzipResponse array
      response.fileBuffer = fileBuffer;
    }

    // Create a new zip with the modified Excel sheet and return its buffer
    return await this.createZipFiles(unzipResponse);
  }

  async unzipFile(
    buffer: Buffer,
    basePath = '',
  ): Promise<Array<{ fileBuffer: Buffer; fileName: string }>> {
    try {
      const zip = new JSZip();
      await zip.loadAsync(buffer);

      const files = Object.values(zip.files);
      const extractedFiles = [];

      for (const file of files) {
        const filePath = basePath ? `${basePath}/${file.name}` : file.name;

        if (file.dir || file.name.endsWith('.zip')) {
          // If it's a directory or a zip file, recursively unzip its contents
          const subFiles = await this.unzipFile(
            await file.async('nodebuffer'),
            filePath,
          );
          extractedFiles.push(...subFiles);
        } else {
          // If it's a file, extract its content
          const fileBuffer = await file.async('nodebuffer');
          extractedFiles.push({ fileName: filePath, fileBuffer });
        }
      }

      return extractedFiles;
    } catch (error) {
      this.logger.error('Failed to unzip file', error);
      throw new InternalServerErrorException('Failed to unzip file');
    }
  }

  async updateExcelSheet(
    excelFileBuffer: Buffer,
    fileName: string,
  ): Promise<Buffer> {
    // Read the Excel workbook from the provided buffer
    const workbook = XLSX.read(excelFileBuffer, { type: 'buffer' });

    // Get the 'settings' named sheet from the workbook,
    const sheet = workbook.Sheets['settings'] ||  workbook.Sheets['setting'];

    if (!sheet) {
      // Throw an exception if the 'settings' sheet is not found
      throw new NotFoundException(
        `Sheet 'settings' not found in file:- '${fileName}'`,
      );
    }

    // Decode the range of the sheet to iterate over its cells
    const range = XLSX.utils.decode_range(sheet['!ref'] || '');

    // Check if the specified columnIndex corresponds to 'form_id' column
    const expectedColumnName = 'form_id'; // Expected column name
    const columnIndex = 1; // Fixed column index for the expectedColumnName ('form_id') column

    // Get the column name for the specified column index
    const columnName = XLSX.utils.encode_col(columnIndex);

    // Check if the column name matches the expected column name
    if (
      sheet[columnName + '1'] &&
      sheet[columnName + '1'].v !== expectedColumnName
    ) {
      throw new BadRequestException(
        `Specified columnIndex #${columnIndex}, does not correspond to '${expectedColumnName}' column`,
      );
    }

    // Iterate over each row in the 'settings' sheet
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: columnIndex });
      const cell = sheet[cellAddress];

      if (cell && cell.v) {
        // Modify the value of 'form_id'
        const formId = cell.v;
        cell.v = `${formId}_updated`;
      }
    }

    // Write the modified workbook back to a buffer
    return XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer',
    });
  }


  async createZipFiles(
    files: { fileName: string; fileBuffer: Buffer }[],
  ): Promise<Buffer> {
    try {
      const zip = new JSZip();

      // Group files by directory path
      const filesByPath: {
        [path: string]: { fileName: string; fileBuffer: Buffer }[];
      } = {};

      for (const file of files) {
        // Use forward slashes as directory separators
        const normalizedFileName = file.fileName.replace(/\\/g, '/');

        const parts = normalizedFileName.split('/');
        const fileName = parts.pop() as string;
        const directory = parts.join('/');
        if (!filesByPath[directory]) {
          filesByPath[directory] = [];
        }
        filesByPath[directory].push({ fileName, fileBuffer: file.fileBuffer });
      }

      // Add files to the zip
      for (const directory in filesByPath) {
        if (filesByPath.hasOwnProperty(directory)) {
          const filesInDirectory = filesByPath[directory];
          if (directory) {
            // If it's a directory, create a nested zip for its contents
            const nestedZipBuffer = await this.createZipFiles(filesInDirectory);
            zip.file(directory, nestedZipBuffer);
          } else {
            // Otherwise, add files directly to the zip
            for (const file of filesInDirectory) {
              zip.file(file.fileName, file.fileBuffer);
            }
          }
        }
      }

      // Generate the zip buffer
      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        platform: 'UNIX',
        streamFiles: true,
      });
      return zipBuffer;
    } catch (error) {
      this.logger.error('Failed to create zip file', error);
      throw new InternalServerErrorException('Failed to create zip file');
    }
  }
}
