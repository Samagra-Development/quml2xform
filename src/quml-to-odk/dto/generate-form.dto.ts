import { IsArray, IsIn, IsNotEmpty, IsNumber, IsString, Min } from "class-validator";
import { QuestionTypesEnum } from '../enums/question-types.enum';

export class GenerateFormDto {
  @IsArray()
  @IsNotEmpty()
  public boards: string;

  @IsArray()
  @IsNotEmpty()
  public grades: string;

  @IsArray()
  @IsNotEmpty()
  public subjects: string;

  @IsArray()
  public competencies: string;

  @IsNumber()
  @Min(1)
  public randomQuestionsCount: number;

  @IsString()
  @IsIn([QuestionTypesEnum.MCQ])
  public qType: string;
}
