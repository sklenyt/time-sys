import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  heslo!: string;

  @IsString()
  @IsNotEmpty()
  jmeno!: string;

  @IsOptional()
  @IsUUID()
  organizaceId?: string;
}
