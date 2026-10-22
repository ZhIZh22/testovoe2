export const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export const seatsText = (n: number) => `${n} ${plural(n, "место", "места", "мест")}`;

const fmt = (opts: Intl.DateTimeFormatOptions) => (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat("ru-RU", { ...opts, timeZone }).format(new Date(iso));

export const dayMonth = fmt({ day: "numeric", month: "long" });
export const dayShort = fmt({ day: "numeric", month: "short" });
export const weekday = fmt({ weekday: "short" });
export const time = fmt({ hour: "2-digit", minute: "2-digit" });
export const fullDate = fmt({ weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export function isoDay(iso: string, timeZone: string) {
  // YYYY-MM-DD в часовом поясе города
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(iso));
}

