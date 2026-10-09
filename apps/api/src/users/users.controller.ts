import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { AuthenticatedUser, CurrentUser } from "../auth/decorators/current-user.decorator";
import { UpdateUserDto } from "./dto/update-user.dto";
import { DeleteOwnAccountDto } from "./dto/delete-own-account.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  seznam(@CurrentUser() user: AuthenticatedUser) {
    return this.users.seznam(user);
  }

  @HttpCode(200)
  @Post("me/smazat")
  smazatVlastni(@CurrentUser() user: AuthenticatedUser, @Body() dto: DeleteOwnAccountDto) {
    return this.users.smazatVlastniUcet(user, dto.heslo);
  }

  @Delete(":id")
  smazat(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.users.smazat(user, id);
  }

  @Patch(":id")
  upravit(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto
  ) {
    return this.users.upravit(user, id, dto);
  }
}
