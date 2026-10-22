// Те же правила, что в backend/app/rules.py. Сервер проверяет заказ повторно.

export const MAX_PARTICIPANTS = 4;
export const FULL_PRICE = 2000;
export const CHILD_PRICE = 1000;
export const FULL_TICKET_AGE = 14;
export const ADULT_AGE = 18;
export const MAX_AGE = 120;

export type TicketType = "full" | "child";

export interface ParticipantDraft {
  key: string;
  name: string;
  age: string; // строка из поля ввода
}

export type FieldErrors = { name?: string; age?: string };

export const ticketType = (age: number): TicketType => (age >= FULL_TICKET_AGE ? "full" : "child");
export const ticketPrice = (age: number) => (ticketType(age) === "full" ? FULL_PRICE : CHILD_PRICE);

export function parseAge(raw: string): number | null {
  if (!/^\d{1,3}$/.test(raw.trim())) return null;
  const n = Number(raw);
  return n <= MAX_AGE ? n : null;
}

export function fieldErrors(p: ParticipantDraft, minAge = 0): FieldErrors {
  const e: FieldErrors = {};
  if (!p.name.trim()) e.name = "Укажите имя";
  const age = parseAge(p.age);
  if (p.age.trim() === "") e.age = "Укажите возраст";
  else if (age === null) e.age = "Возраст — число от 0 до 120";
  else if (age < minAge) e.age = `Мероприятие для зрителей ${minAge}+`;
  return e;
}

/** Ошибка состава заказа целиком (не привязана к одному полю). */
export function compositionError(participants: ParticipantDraft[]): string | null {
  const ages = participants.map((p) => parseAge(p.age)).filter((a): a is number => a !== null);
  const hasChild = ages.some((a) => ticketType(a) === "child");
  const hasAdult = ages.some((a) => a >= ADULT_AGE);
  if (hasChild && !hasAdult) return "Ребёнок до 14 лет может пройти только вместе со взрослым от 18 лет. Добавьте взрослого в этот заказ.";
  return null;
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

export interface Summary {
  full: number;
  child: number;
  total: number;
}

export function summarize(participants: ParticipantDraft[]): Summary {
  const s: Summary = { full: 0, child: 0, total: 0 };
  for (const p of participants) {
    const age = parseAge(p.age);
    if (age === null) continue;
    s[ticketType(age)] += 1;
    s.total += ticketPrice(age);
  }
  return s;
}
