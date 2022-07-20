import { IsEmpty, IsNotEmpty, IsString } from "class-validator";

export class QuestionBankFilterDto {
  @IsString()
  @IsNotEmpty()
  public board: string;

  @IsString()
  @IsNotEmpty()
  public grade: string;

  @IsString()
  @IsNotEmpty()
  public subject: string;

  @IsString()
  public competency: string;
}
