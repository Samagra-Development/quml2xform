import { Controller, Post, Body } from '@nestjs/common';
import { GenerateFormDto } from './dto/generate-form.dto';
import { QumlToOdkService } from './quml-to-odk.service';

@Controller('quml-to-odk')
export class QumlToOdkController {
  constructor(private readonly service: QumlToOdkService) {}

  @Post()
  public generate(@Body() createQumlToOdkDto: GenerateFormDto): any {
    return this.service.generate(createQumlToOdkDto);
  }

  @Post('bulk')
  public async generateBulk(@Body() body): Promise<Array<GenerateFormDto>> {
    return this.service.generateBulk(body);
  }
}
