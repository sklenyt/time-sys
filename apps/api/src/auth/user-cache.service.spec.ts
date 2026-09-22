import { UserCacheService } from "./user-cache.service";
import type { AuthenticatedUser } from "./decorators/current-user.decorator";

const USER: AuthenticatedUser = {
  id: "user-1",
  email: "a@b.cz",
  jmeno: "Adam",
  organizaceId: "org-1",
  poradiMenu: [],
};

describe("UserCacheService", () => {
  it("vrací null, dokud pro daného uživatele nic není v cache", () => {
    const cache = new UserCacheService();
    expect(cache.get("user-1")).toBeNull();
  });

  it("po set() vrátí uloženého uživatele", () => {
    const cache = new UserCacheService();
    cache.set(USER.id, USER);
    expect(cache.get(USER.id)).toEqual(USER);
  });

  it("po invalidate() se záznam smaže", () => {
    const cache = new UserCacheService();
    cache.set(USER.id, USER);
    cache.invalidate(USER.id);
    expect(cache.get(USER.id)).toBeNull();
  });

  it("po vypršení TTL vrátí null, i když záznam mezitím nikdo nesmazal", () => {
    jest.useFakeTimers();
    const cache = new UserCacheService();
    cache.set(USER.id, USER);
    jest.advanceTimersByTime(31_000);
    expect(cache.get(USER.id)).toBeNull();
    jest.useRealTimers();
  });
});
