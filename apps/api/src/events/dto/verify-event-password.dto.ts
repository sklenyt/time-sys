import { IsString, MinLength } from "class-validator";

export class VerifyEventPasswordDto {
  @IsString()
  @MinLength(1)
  heslo!: string;
}
