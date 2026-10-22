import { Link } from "react-router-dom";
import type { Event } from "../lib/api";
import { dayShort, plural, rub, time, weekday } from "../lib/format";
import { CHILD_PRICE, FULL_PRICE, FULL_TICKET_AGE } from "../lib/rules";
import { AgeChip, Arrow, Cover, SeatsChip, firstOpen } from "./ui";

/** Карточка в духе выдачи Авиасейлс: слева описание, справа «корешок» с ценой. */
export function EventCard({ event }: { event: Event }) {
  const tz = event.city.timezone;
  const next = firstOpen(event.sessions) ?? event.sessions[0];
  const childAllowed = event.min_age < FULL_TICKET_AGE;
  const more = event.sessions.length - 1;
  const soldOut = event.sessions.every((s) => s.seats_left <= 0);
  const href = `/events/${event.id}`;

  return (
    <article className="card group grid overflow-hidden transition hover:shadow-[var(--shadow-float)] sm:grid-cols-[200px_1fr_auto]">
      <Link to={href} tabIndex={-1} className="relative block h-28 sm:h-auto" aria-hidden="true">
        <Cover event={event} />
      </Link>

      <div className="flex min-w-0 flex-col gap-2.5 p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {event.category && <span className="chip bg-brand-50 text-brand">{event.category}</span>}
          <AgeChip age={event.min_age} />
        </div>
        <h3 className="text-[19px] font-extrabold leading-tight">
          <Link to={href} className="hover:text-brand">{event.title}</Link>
        </h3>
        {event.place && <p className="text-[15px] text-muted">{event.place}</p>}
        <p className="mt-auto flex flex-wrap items-baseline gap-x-2 text-[15px] font-semibold tabular-nums">
          <span className="text-ink">{dayShort(next.starts_at, tz)}, {weekday(next.starts_at, tz)}</span>
          <span className="text-muted">{time(next.starts_at, tz)}</span>
          {more > 0 && <span className="text-brand">и ещё {more} {plural(more, "дата", "даты", "дат")}</span>}
        </p>
      </div>

      <div className="relative flex items-center justify-between gap-4 border-t border-dashed border-line p-5 sm:w-[230px] sm:flex-col sm:items-stretch sm:justify-center sm:border-l sm:border-t-0">
        <div>
          <p className="text-[26px] font-extrabold leading-none tabular-nums">
            {childAllowed ? <><span className="text-[15px] font-bold text-muted">от </span>{rub(CHILD_PRICE)}</> : rub(FULL_PRICE)}
          </p>
          <div className="mt-2"><SeatsChip seats={soldOut ? 0 : next.seats_left} /></div>
        </div>
        <Link to={href} className={`btn h-12 px-5 text-[15px] ${soldOut ? "bg-mist text-muted" : "bg-brand text-white hover:bg-brand-600"}`}>
          {soldOut ? "Подробнее" : "Выбрать"} <Arrow />
        </Link>
      </div>
    </article>
  );
}
