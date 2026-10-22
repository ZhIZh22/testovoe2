import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Checkout } from "../components/Checkout";
import { AgeChip, Cover, ExternalIcon, Notice, Spinner } from "../components/ui";
import { api, type Event } from "../lib/api";

export function EventPage() {
  const { id = "" } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    try {
      const e = await api.event(id);
      setEvent(e);
      return e;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить мероприятие");
      return null;
    }
  }, [id]);

  useEffect(() => { setEvent(null); setError(null); load(); window.scrollTo(0, 0); }, [load]);

  if (error && !event) {
    return (
      <div className="container-x flex flex-col items-start gap-4 pt-10">
        <Notice tone="danger">{error}</Notice>
        <Link to="/" className="btn-line">Вернуться в афишу</Link>
      </div>
    );
  }
  if (!event) return <div className="container-x flex items-center gap-3 pt-16 text-muted"><Spinner /> Загружаем…</div>;

  const long = event.description.length > 260;

  return (
    <div className="container-x flex flex-col gap-6 pt-6 pb-24 lg:pb-0">
      <Link to={`/?city=${event.city.slug}`} className="self-start text-[15px] font-bold text-brand hover:underline">
        ← Афиша: {event.city.name}
      </Link>

      <section className="card grid overflow-hidden md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="relative h-52 md:h-auto md:min-h-[300px]"><Cover event={event} /></div>
        <div className="flex min-w-0 flex-col gap-3 p-5 sm:p-7">
          <div className="flex flex-wrap gap-1.5">
            {event.category && <span className="chip bg-brand-50 text-brand">{event.category}</span>}
            <AgeChip age={event.min_age} />
          </div>
          <h1 className="font-display text-[clamp(24px,4.2vw,40px)] font-bold uppercase leading-[1.05] tracking-[-0.01em]">
            {event.title}
          </h1>
          {(event.place || event.address) && (
            <p className="text-[16px] font-semibold">
              {event.place}
              {event.address && <span className="block font-medium text-muted">{event.address}, {event.city.name}</span>}
            </p>
          )}
          {event.description && (
            <div className="max-w-[65ch] text-[16px] leading-relaxed text-ink/80">
              <p className={!expanded && long ? "line-clamp-4" : ""}>{event.description}</p>
              {long && (
                <button className="mt-1 text-[15px] font-bold text-brand" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? "Свернуть" : "Читать полностью"}
                </button>
              )}
            </div>
          )}
          {event.url && (
            <a href={event.url} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-1.5 self-start text-[14px] font-semibold text-muted hover:text-brand">
              Страница на KudaGo <ExternalIcon />
            </a>
          )}
        </div>
      </section>

      <Checkout key={event.id} event={event} onRefresh={load} />
    </div>
  );
}
