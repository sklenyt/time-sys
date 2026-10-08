import { jeSuperAdmin } from "./superadmin";

describe("jeSuperAdmin", () => {
  const puvodni = { ...process.env };

  afterEach(() => {
    process.env = { ...puvodni };
  });

  it("recognises listed e-mails case-insensitively and ignores spaces", () => {
    process.env.SUPERADMIN_EMAILS = " Sklenda.Tom@gmail.com , jiny@example.cz";
    expect(jeSuperAdmin("sklenda.tom@gmail.com")).toBe(true);
    expect(jeSuperAdmin("JINY@example.cz")).toBe(true);
    expect(jeSuperAdmin("cizi@example.cz")).toBe(false);
  });

  it("is off when the variable is unset or empty, and for missing e-mails", () => {
    delete process.env.SUPERADMIN_EMAILS;
    expect(jeSuperAdmin("sklenda.tom@gmail.com")).toBe(false);
    process.env.SUPERADMIN_EMAILS = "";
    expect(jeSuperAdmin("")).toBe(false);
    expect(jeSuperAdmin(null)).toBe(false);
  });
});
