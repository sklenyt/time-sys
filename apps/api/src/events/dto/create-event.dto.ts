import { IsDateString, IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CreateEventDto {
  @IsUUID()
  organizaceId!: string;

  @IsString()
  @IsNotEmpty()
  nazev!: string;

  @IsDateString()
  datum!: string;
}
