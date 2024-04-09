import { Module } from '@nestjs/common';
import { ZipFormsService } from './zip-forms.service';
import { ZipFormsController } from './zip-forms.controller';

@Module({
  controllers: [ZipFormsController],
  providers: [ZipFormsService]
})
export class ZipFormsModule {}
