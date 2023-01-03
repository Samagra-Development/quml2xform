import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FormService } from './form.service';

@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [FormService],
})
export class FormUploadModule {}
