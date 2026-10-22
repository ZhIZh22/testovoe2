import { Link } from "react-router-dom";
import type { Event, Order } from "../lib/api";
import { dayMonth, fullDate, rub, time } from "../lib/format";
import { Arrow } from "./ui";

export function OrderSuccess({ order, event }: { order: Order; event: Event }) {
  const tz = event.city.timezone;
  return (
    <div className="flex flex-col gap-6">
      <section className="card rise overflow-hidden">
        <div className="bg-brand px-5 py-7 text-white sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-white text-brand" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <p className="text-[15px] font-bold text-white/85">Заказ {order.id}</p>
          </div>
          <h2 className="mt-4 font-display text-[clamp(26px,5vw,40px)] font-black uppercase leading-[1.02]">
            Билеты <span className="text-brand-100/70">оформлены</span>
          </h2>
          <p className="mt-3 max-w-[52ch] text-[16px] text-white/85">
            Отправим {order.lines.length > 1 ? "билеты" : "билет"} на <b className="break-all text-white">{order.email}</b>. На входе достаточно
            показать QR-код с телефона.
          </p>
        </div>

        <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
          {order.lines.map((l, i) => (
            <li key={i} className="grid grid-cols-[1fr_auto] overflow-hidden rounded-2xl border border-line">
              <div className="min-w-0 p-4">
                <p className="eyebrow">{l.ticket === "child" ? "Детский" : "Полный"} билет</p>
                <p className="mt-1 truncate text-[18px] font-extrabold">{l.name}</p>
                <p className="mt-2 text-[14px] font-semibold tabular-nums text-muted">
                  {dayMonth(order.starts_at, tz)} · {time(order.starts_at, tz)}
                </p>
                <p className="truncate text-[14px] text-muted">{event.place ?? event.city.name}</p>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 border-l border-dashed border-line bg-mist px-4">
                <QrStub seed={`${order.id}-${i}`} />
                <span className="text-[13px] font-bold tabular-nums">{rub(l.price)}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-4 border-t border-line px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="tabular-nums">
            <p className="text-[14px] text-muted first-letter:uppercase">{fullDate(order.starts_at, tz)}</p>
            <p className="text-[15px] font-semibold">{event.address ?? event.place}</p>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-[15px] font-bold text-muted">Оплачено</span>
            <span className="font-display text-[26px] font-bold tabular-nums">{rub(order.total)}</span>
          </div>
        </div>
      </section>

      <Link to="/" className="btn-line self-start">Вернуться в афишу <Arrow /></Link>
    </div>
  );
}

/** Декоративный «QR»: детерминированная сетка из номера заказа. */
function QrStub({ seed }: { seed: string }) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const cells: boolean[] = [];
  for (let i = 0; i < 49; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    cells.push((h & 1) === 1);
  }
  return (
    <svg width="56" height="56" viewBox="0 0 7 7" className="text-ink" aria-label="QR-код билета" shapeRendering="crispEdges">
      {cells.map((on, i) => on && <rect key={i} x={i % 7} y={Math.floor(i / 7)} width="1" height="1" fill="currentColor" />)}
    </svg>
  );
}
