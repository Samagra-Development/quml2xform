import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { QuestionTypesEnum } from '../enums/question-types.enum';

export class GenerateFormDto {
  @IsArray()
  @ArrayNotEmpty()
  public boards: Array<string>;

  @IsArray()
  @ArrayNotEmpty()
  public grades: Array<string>;

  @IsArray()
  @ArrayNotEmpty()
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
