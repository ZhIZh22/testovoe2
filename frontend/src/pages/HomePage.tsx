import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EventCard } from "../components/EventCard";
import { Notice, Spinner } from "../components/ui";
import { api, type City, type Event } from "../lib/api";
import { isoDay } from "../lib/format";

const CITY_IN: Record<string, string> = {
  msk: "в Москве", spb: "в Петербурге", kzn: "в Казани", ekb: "в Екатеринбурге",
  nsk: "в Новосибирске", nnv: "в Нижнем", krd: "в Краснодаре", sochi: "в Сочи",
};

type When = "any" | "today" | "weekend" | "week" | "month";
const WHEN: { id: When; label: string }[] = [
  { id: "any", label: "Любая дата" },
  { id: "today", label: "Сегодня" },
  { id: "weekend", label: "Выходные" },
  { id: "week", label: "7 дней" },
  { id: "month", label: "30 дней" },
];

function matchesWhen(event: Event, when: When) {
  if (when === "any") return true;
  const tz = event.city.timezone;
  const today = isoDay(new Date().toISOString(), tz);
  const days = when === "week" ? 7 : when === "month" ? 30 : when === "weekend" ? 7 : 0;
  const limit = isoDay(new Date(Date.now() + days * 864e5).toISOString(), tz);
  return event.sessions.some((s) => {
    const d = isoDay(s.starts_at, tz);
    if (d < today || d > limit) return false;
    if (when === "weekend") return [0, 6].includes(new Date(`${d}T12:00:00`).getDay());
    return true;
  });
}

const readCity = () => {
  try { return localStorage.getItem("city") ?? "msk"; } catch { return "msk"; }
};

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const city = params.get("city") ?? readCity();
  const [cities, setCities] = useState<City[]>([]);
  const [data, setData] = useState<{ source: string; events: Event[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [when, setWhen] = useState<When>("any");
  const [category, setCategory] = useState("all");

  useEffect(() => { api.cities().then(setCities).catch(() => {}); }, []);
  useEffect(() => {
    setData(null);
    setError(null);
    setCategory("all");
    api.events(city).then(setData).catch((e) => setError(e.message));
    try { localStorage.setItem("city", city); } catch { /* приватный режим */ }
  }, [city]);

  const categories = useMemo(
    () => [...new Set((data?.events ?? []).map((e) => e.category).filter(Boolean) as string[])].sort(),
    [data],
  );
  const shown = (data?.events ?? []).filter(
    (e) => matchesWhen(e, when) && (category === "all" || e.category === category),
  );

  return (
    <>
      <section className="bg-brand pb-10 text-white sm:pb-14">
        <div className="container-x pt-8 sm:pt-14">
          <h1 className="font-display text-[clamp(34px,8.4vw,92px)] font-black uppercase leading-[0.95] tracking-[-0.02em]">
            <span className="block">Билеты</span>
            <span className="block text-brand-100/70">на события</span>
            <span className="block text-white/95">{CITY_IN[city] ?? "в городе"}</span>
          </h1>
          <p className="mt-5 max-w-[46ch] text-[17px] font-medium text-white/80">
            До четырёх участников в одном заказе. Детский билет до 14 лет — вдвое дешевле.
          </p>

          {/* Поисковая строка как у Авиасейлс: сегменты в одну полосу */}
          <form
            className="mt-8 grid gap-[2px] overflow-hidden rounded-2xl bg-brand-600 text-ink sm:grid-cols-[1.1fr_1fr_1fr_auto]"
            onSubmit={(e) => { e.preventDefault(); document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }); }}
          >
            <div className="field rounded-none border-0">
              <label htmlFor="city">Город</label>
              <select id="city" value={city} onChange={(e) => setParams({ city: e.target.value })}>
                {(cities.length ? cities : [{ slug: city, name: "Москва" } as City]).map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field rounded-none border-0">
              <label htmlFor="when">Когда</label>
              <select id="when" value={when} onChange={(e) => setWhen(e.target.value as When)}>
                {WHEN.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
              </select>
            </div>
            <div className="field rounded-none border-0">
              <label htmlFor="category">Что</label>
              <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="all">Все события</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button className="btn h-[60px] rounded-none bg-brand-800 px-8 text-[17px] text-white hover:bg-ink">
              Показать
            </button>
          </form>
        </div>
      </section>

      <section id="results" className="container-x scroll-mt-4 pt-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-[22px] font-bold uppercase sm:text-[26px]">Афиша</h2>
          {data && <p className="text-[15px] font-semibold text-muted">Найдено: {shown.length}</p>}
        </div>

        {data?.source === "mock" && (
          <div className="mb-5">
            <Notice>KudaGo сейчас не отвечает, поэтому показываем демо-афишу. Оформление работает так же.</Notice>
          </div>
        )}
        {error && <Notice tone="danger">{error}</Notice>}
        {!data && !error && (
          <div className="flex items-center gap-3 py-16 text-muted"><Spinner /> Загружаем афишу…</div>
        )}
        {data && shown.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-[17px] font-bold">По этим фильтрам ничего нет</p>
            <button className="btn-ghost mt-4" onClick={() => { setWhen("any"); setCategory("all"); }}>Сбросить фильтры</button>
          </div>
        )}
        <div className="grid gap-4">
          {shown.map((e, i) => (
            <div key={e.id} className="rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <EventCard event={e} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
