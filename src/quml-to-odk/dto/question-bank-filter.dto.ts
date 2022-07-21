import { IsArray, IsNotEmpty, IsNumber } from "class-validator";

export class QuestionBankFilterDto {
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
  public randomQuestionsCount: number;
}
