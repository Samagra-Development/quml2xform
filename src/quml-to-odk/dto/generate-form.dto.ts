import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { QuestionTypesEnum } from '../enums/question-types.enum';

export class GenerateFormDto {
  @IsArray()
  @IsNotEmpty()
  public boards: Array<string>;

  @IsArray()
  @IsNotEmpty()
  public grades: Array<string>;

  @IsArray()
  @IsNotEmpty()
  public subjects: Array<string>;

  @IsArray()
  public competencies: Array<string>;

  @IsNumber()
  @Min(1)
  public randomQuestionsCount: number;

  @IsString()
  @IsIn([QuestionTypesEnum.MCQ])
  public qType: string;
}
