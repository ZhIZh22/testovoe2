import { describe, expect, it } from "vitest";
import { compositionError, fieldErrors, parseAge, summarize, type ParticipantDraft } from "./rules";

const p = (name: string, age: string): ParticipantDraft => ({ key: name + age, name, age });

describe("rules", () => {
  it("считает стоимость по возрасту", () => {
    expect(summarize([p("Анна", "34"), p("Маша", "9"), p("Петя", "14")])).toEqual({ full: 2, child: 1, total: 5000 });
  });
  it("ребёнок только со взрослым 18+", () => {
    expect(compositionError([p("Маша", "9")])).not.toBeNull();
    expect(compositionError([p("Маша", "9"), p("Петя", "17")])).not.toBeNull();
    expect(compositionError([p("Маша", "9"), p("Анна", "18")])).toBeNull();
    expect(compositionError([p("Петя", "15")])).toBeNull();
  });
  it("проверяет поля", () => {
    expect(parseAge("abc")).toBeNull();
    expect(parseAge("121")).toBeNull();
    expect(fieldErrors(p("", ""))).toEqual({ name: "Укажите имя", age: "Укажите возраст" });
    expect(fieldErrors(p("Маша", "4"), 6).age).toMatch("6+");
  });
});
