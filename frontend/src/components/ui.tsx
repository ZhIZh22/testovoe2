import { useState, type ReactNode } from "react";
import type { Event, Session } from "../lib/api";
import { seatsText } from "../lib/format";

export const LOW_SEATS = 5;

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExternalIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 4h6v6m0-6-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Spinner() {
  return <span className="inline-block size-5 animate-spin rounded-full border-[2.5px] border-current border-r-transparent" aria-hidden="true" />;
}

export function SeatsChip({ seats }: { seats: number }) {
  if (seats <= 0) return <span className="chip bg-danger-50 text-danger">Мест нет</span>;
  if (seats <= LOW_SEATS) return <span className="chip bg-warn-50 text-warn">Осталось {seatsText(seats)}</span>;
  return <span className="chip bg-ok-50 text-ok">Есть места</span>;
}

export function AgeChip({ age }: { age: number }) {
  return <span className="chip border border-line bg-white text-ink">{age}+</span>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "danger"; children: ReactNode }) {
  const tones = {
    info: "bg-brand-50 text-brand-800",
    warn: "bg-warn-50 text-[#9a3a06]",
    danger: "bg-danger-50 text-danger",
  };
  return (
    <div role={tone === "info" ? "note" : "alert"} className={`rounded-2xl px-4 py-3 text-[15px] font-semibold leading-snug ${tones[tone]}`}>
      {children}
    </div>
  );
}

/** Обложка: фото из KudaGo или сгенерированная плашка с категорией контурным шрифтом. */
export function Cover({ event, className = "" }: { event: Event; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (event.image && !broken) {
    return (
      <img
        src={event.image}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  const word = (event.category ?? "Событие").toUpperCase();
  return (
    <div className={`relative h-full w-full overflow-hidden bg-brand [container-type:inline-size] ${className}`} aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_100%_0%,#4d7dff_0%,transparent_60%),radial-gradient(90%_80%_at_0%_100%,#0b2a8a_0%,transparent_65%)]" />
      <svg className="absolute -right-10 -top-16 h-[160%] text-white/15" viewBox="0 0 200 200" fill="none">
        <ellipse cx="100" cy="100" rx="96" ry="60" stroke="currentColor" transform="rotate(-30 100 100)" />
        <ellipse cx="100" cy="100" rx="96" ry="60" stroke="currentColor" transform="rotate(30 100 100)" />
      </svg>
      <span className="absolute bottom-3 left-4 right-4 font-display text-[min(9.6cqw,56px)] font-black leading-none text-white">
        {word}
      </span>
    </div>
  );
}

export const firstOpen = (sessions: Session[]) => sessions.find((s) => s.seats_left > 0) ?? null;
