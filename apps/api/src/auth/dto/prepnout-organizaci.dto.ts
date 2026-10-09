import { IsUUID } from "class-validator";

export class PrepnoutOrganizaciDto {
  @IsUUID()
  organizaceId!: string;
}
