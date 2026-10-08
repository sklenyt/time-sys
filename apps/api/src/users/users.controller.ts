import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from "@nestjs/common";
import { AuthenticatedUser, CurrentUser } from "../auth/decorators/current-user.decorator";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  seznam(@CurrentUser() user: AuthenticatedUser) {
    return this.users.seznam(user);
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
