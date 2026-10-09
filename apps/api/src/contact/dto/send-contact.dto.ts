import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class SendContactDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  jmeno!: string;

  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  zprava!: string;

  /** Past na roboty: skryté pole, které člověk nevyplní. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  web?: string;
}
