import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateOrganizationDto) {
    return this.prisma.organizace.create({ data: { nazev: dto.nazev } });
  }

  findAll() {
    return this.prisma.organizace.findMany({ orderBy: { vytvorenoAt: "desc" } });
  }
}
