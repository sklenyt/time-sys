import { IsNotEmpty, IsString } from "class-validator";

export class DeleteOwnAccountDto {
  /** Potvrzení heslem — smazání účtu nejde vrátit. */
  @IsString()
  @IsNotEmpty()
  heslo!: string;
}
