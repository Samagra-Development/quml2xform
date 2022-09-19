import { IsIn, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { QuestionTypesEnum } from '../enums/question-types.enum';

export class GenerateFormDto {
  @IsString()
  @IsNotEmpty()
  public board: string;

  @IsString()
  @IsNotEmpty()
  @IsIn([
    'Class 1',
    'Class 2',
    'Class 3',
    'Class 4',
    'Class 5',
    'Class 6',
    'Class 7',
    'Class 8',
    'Class 9',
    'Class 10',
    'Class 11',
    'Class 12',
  ])
  public grade: string;

  @IsString()
  @IsNotEmpty()
  public subject: string;

  @IsString()
  @IsNotEmpty()
  public competency: string;

  @IsNumber()
  @Min(1)
  public randomQuestionsCount: number;

  @IsString()
  @IsIn([QuestionTypesEnum.MCQ])
  public qType: string;
}
