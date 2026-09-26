import { jeDatumVMinulosti } from "./datum-v-minulosti";

describe("jeDatumVMinulosti", () => {
  it("včerejšek je v minulosti", () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expect(jeDatumVMinulosti(d)).toBe(true);
  });

  it("zítřek není v minulosti", () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    expect(jeDatumVMinulosti(d)).toBe(false);
  });

  it("dnešní půlnoc (datum bez času, jak appka ukládá @db.Date) ještě není v minulosti", () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    expect(jeDatumVMinulosti(d)).toBe(false);
  });
});
