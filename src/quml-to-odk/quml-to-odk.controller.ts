import { Controller, Post, Body, Query, Get } from "@nestjs/common";
import { GenerateFormDto } from './dto/generate-form.dto';
import { QumlToOdkService } from './quml-to-odk.service';
import { CsvJsonToOdkService } from './csv-json-to-odk.service';
import { DataService } from "./data.service";

@Controller('quml-to-odk')
export class QumlToOdkController {
  constructor(
    private readonly service: QumlToOdkService,
    private readonly csvJsonToOdkService: CsvJsonToOdkService,
    private readonly dataService: DataService,
  ) {}

  @Post()
  public generate(@Body() createQumlToOdkDto: GenerateFormDto): any {
    return this.service.generate(createQumlToOdkDto);
  }

  @Post('bulk')
  public async generateBulk(@Body() body): Promise<Array<GenerateFormDto>> {
    return this.service.generateBulk(body);
  }

  @Post('via-json')
  public async generateViaJson(
    @Body() body,
    @Query('randomQuestionsCount') randomQuestionsCount = 3,
    @Query('board') board = 'State (Haryana)',
  ): Promise<any> {
    return this.csvJsonToOdkService.generateViaJson(
      body,
      randomQuestionsCount,
      board,
    );
  }

  @Get('fetch-all/json')
  public async fetchAllJson(
    @Query('board') board = 'State (Haryana)',
    @Query('limit') limit = 100,
    @Query('offset') offset = 0,
  ): Promise<any> {
    const boards = [board];
    const qType = 'MCQ';
    return this.dataService.fetchAllJson(boards, qType, limit, offset);
  }
}
