import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, api, type Event, type Order } from "../lib/api";
import { dayShort, fullDate, plural, rub, seatsText, time, weekday } from "../lib/format";
import {
  CHILD_PRICE, FULL_PRICE, MAX_PARTICIPANTS, compositionError, fieldErrors, isEmail, parseAge,
  summarize, ticketPrice, ticketType, type ParticipantDraft,
} from "../lib/rules";
import { OrderSuccess } from "./OrderSuccess";
import { Arrow, LOW_SEATS, Notice, Spinner, firstOpen } from "./ui";

type Stage = "form" | "review" | "done" | "soldout";

const newKey = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
const blank = (): ParticipantDraft => ({ key: newKey(), name: "", age: "" });

export function Checkout({ event, onRefresh }: { event: Event; onRefresh: () => Promise<Event | null> }) {
  const tz = event.city.timezone;
  const [sessionId, setSessionId] = useState<string | null>(firstOpen(event.sessions)?.id ?? null);
  const [people, setPeople] = useState<ParticipantDraft[]>([blank()]);
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [showErrors, setShowErrors] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [soldOutLeft, setSoldOutLeft] = useState(0);
  const idemKey = useRef(newKey());
  const topRef = useRef<HTMLDivElement>(null);

  const allSold = event.sessions.every((s) => s.seats_left <= 0);
  const session = event.sessions.find((s) => s.id === sessionId) ?? null;
  const seatsLeft = session?.seats_left ?? 0;
  const summary = summarize(people);
  const composition = compositionError(people);
  const tooMany = session !== null && people.length > seatsLeft;
  const emailError = !email.trim() ? "Укажите email" : !isEmail(email) ? "Проверьте email: например, anna@mail.ru" : null;
  const errorsByKey = useMemo(
    () => Object.fromEntries(people.map((p) => [p.key, fieldErrors(p, event.min_age)])),
    [people, event.min_age],
  );
  const hasFieldErrors = Object.values(errorsByKey).some((e) => e.name || e.age);
  const valid = !!session && seatsLeft > 0 && !tooMany && !hasFieldErrors && !composition && !emailError;
  const show = (id: string) => showErrors || touched.has(id);
  const touch = (id: string) => setTouched((t) => new Set(t).add(id));

  // Любое изменение данных — это новый заказ для сервера
  useEffect(() => { idemKey.current = newKey(); }, [sessionId, people, email]);

  const scrollTop = () => requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  const goToSection = (id: string) => {
    setStage("form");
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  function toReview() {
    if (!valid) {
      setShowErrors(true);
      requestAnimationFrame(() => {
        const bad = document.querySelector<HTMLElement>("[data-invalid='true'] input, [data-invalid='true'] button, [data-invalid='true']");
        bad?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (bad instanceof HTMLInputElement) bad.focus({ preventScroll: true });
      });
      return;
    }
    setServerError(null);
    setStage("review");
    scrollTop();
  }

  async function confirm() {
    if (!session || submitting) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const created = await api.createOrder(
        {
          session_id: session.id,
          email: email.trim(),
          participants: people.map((p) => ({ name: p.name.trim(), age: parseAge(p.age)! })),
        },
        idemKey.current,
      );
      setOrder(created);
      setStage("done");
      onRefresh();
      scrollTop();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setSoldOutLeft(e.detail?.seats_left ?? 0);
        setStage("soldout");
        onRefresh();
        scrollTop();
      } else if (e instanceof ApiError && e.status === 422) {
        setServerError("Сервер не принял данные участников. Проверьте их и попробуйте ещё раз.");
        setShowErrors(true);
        setStage("form");
      } else {
        setServerError(e instanceof Error ? e.message : "Не удалось оформить заказ");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const update = (key: string, patch: Partial<ParticipantDraft>) =>
    setPeople((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const remove = (key: string) => setPeople((ps) => ps.filter((p) => p.key !== key));
  const addLimit = Math.min(MAX_PARTICIPANTS, session ? seatsLeft : MAX_PARTICIPANTS);

  if (stage === "done" && order) {
    return (
      <div ref={topRef} className="scroll-mt-4">
        <OrderSuccess order={order} event={event} />
      </div>
    );
  }

  const summaryCard = (
    <OrderSummary
      event={event} sessionLabel={session ? fullDate(session.starts_at, tz) : "Сеанс не выбран"}
      full={summary.full} child={summary.child} total={summary.total}
    />
  );

  return (
    <div ref={topRef} className="grid scroll-mt-4 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-5">
        {stage === "soldout" && (
          <SoldOut
            event={event} wanted={people.length} left={soldOutLeft} tz={tz} currentId={sessionId}
            onSession={(id) => { setSessionId(id); setStage("review"); scrollTop(); }}
            onEdit={() => goToSection("people")}
            onSessions={() => goToSection("sessions")}
          />
        )}

        {stage === "review" && (
          <Review
            event={event} people={people} email={email} sessionLabel={session ? fullDate(session.starts_at, tz) : ""}
            total={summary.total} onEdit={goToSection}
          />
        )}

        {stage === "form" && allSold && <Notice tone="danger">Билеты на все даты распроданы.</Notice>}

        {stage === "form" && !allSold && (
          <>
            {serverError && <Notice tone="danger">{serverError}</Notice>}

            <Step id="sessions" n={1} title="Дата и время">
              {event.sessions.length === 0 && <p className="text-muted">Ближайших сеансов нет.</p>}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" data-invalid={show("session") && !session}>
                {event.sessions.map((s) => {
                  const active = s.id === sessionId;
                  const none = s.seats_left <= 0;
                  return (
                    <button
                      key={s.id} type="button" disabled={none} aria-pressed={active}
                      onClick={() => setSessionId(s.id)}
                      className={`flex flex-col items-start rounded-2xl border-2 px-4 py-3 text-left transition tabular-nums
                        ${active ? "border-brand bg-brand-50" : "border-line bg-white hover:border-brand/50"}
                        ${none ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <span className="text-[13px] font-semibold capitalize text-muted">{weekday(s.starts_at, tz)}</span>
                      <span className="text-[17px] font-extrabold">{dayShort(s.starts_at, tz)}</span>
                      <span className="text-[15px] font-bold text-ink/80">{time(s.starts_at, tz)}</span>
                      <span className={`mt-1 text-[13px] font-bold ${none ? "text-danger" : s.seats_left <= LOW_SEATS ? "text-warn" : "text-ok"}`}>
                        {none ? "Мест нет" : s.seats_left <= LOW_SEATS ? `Осталось ${seatsText(s.seats_left)}` : "Есть места"}
                      </span>
                    </button>
                  );
                })}
              </div>
              {showErrors && !session && <p className="field-error">Выберите дату</p>}
            </Step>

            <Step id="people" n={2} title="Участники" aside={`${people.length} из ${MAX_PARTICIPANTS}`}>
              {event.min_age > 0 && (
                <p className="text-[15px] text-muted">Возрастное ограничение мероприятия: {event.min_age}+.</p>
              )}
              <div className="flex flex-col gap-3">
                {people.map((p, i) => {
                  const err = errorsByKey[p.key];
                  const age = parseAge(p.age);
                  return (
                    <fieldset key={p.key} className="rounded-2xl border border-line bg-mist/60 p-4">
                      <legend className="sr-only">Участник {i + 1}</legend>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-[16px] font-extrabold">Участник {i + 1}</p>
                        <div className="flex items-center gap-2">
                          {age !== null && !err.age && (
                            <span className={`chip ${ticketType(age) === "child" ? "bg-warn-50 text-warn" : "bg-brand-50 text-brand"}`}>
                              {ticketType(age) === "child" ? "Детский" : "Полный"} · {rub(ticketPrice(age))}
                            </span>
                          )}
                          {people.length > 1 && (
                            <button type="button" onClick={() => remove(p.key)}
                              className="rounded-full px-2 py-1 text-[14px] font-bold text-muted hover:bg-danger-50 hover:text-danger">
                              Убрать
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                        <div>
                          <div className="field" data-invalid={show(`${p.key}.name`) && !!err.name}>
                            <label htmlFor={`name-${p.key}`}>Имя</label>
                            <input
                              id={`name-${p.key}`} value={p.name} maxLength={80} placeholder="Анна"
                              autoComplete={i === 0 ? "given-name" : "off"} autoCapitalize="words"
                              onChange={(e) => update(p.key, { name: e.target.value })}
                              onBlur={() => touch(`${p.key}.name`)}
                            />
                          </div>
                          {show(`${p.key}.name`) && err.name && <p className="field-error">{err.name}</p>}
                        </div>
                        <div>
                          <div className="field" data-invalid={show(`${p.key}.age`) && !!err.age}>
                            <label htmlFor={`age-${p.key}`}>Возраст, лет</label>
                            <input
                              id={`age-${p.key}`} value={p.age} inputMode="numeric" maxLength={3} placeholder="30"
                              onChange={(e) => update(p.key, { age: e.target.value.replace(/\D/g, "") })}
                              onBlur={() => touch(`${p.key}.age`)}
                            />
                          </div>
                          {show(`${p.key}.age`) && err.age && <p className="field-error">{err.age}</p>}
                        </div>
                      </div>
                    </fieldset>
                  );
                })}
              </div>

              {composition && <div data-invalid="true"><Notice tone="warn">{composition}</Notice></div>}
              {tooMany && (
                <div data-invalid="true">
                  <Notice tone="danger">
                    На этот сеанс осталось {seatsText(seatsLeft)}. Уберите {people.length - seatsLeft}{" "}
                    {plural(people.length - seatsLeft, "участника", "участников", "участников")} или выберите другую дату.
                  </Notice>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn-ghost" disabled={people.length >= addLimit}
                  onClick={() => setPeople((ps) => [...ps, blank()])}>
                  + Добавить участника
                </button>
                <span className="text-[14px] text-muted">
                  {people.length >= MAX_PARTICIPANTS
                    ? "В заказе максимум 4 участника"
                    : session && people.length >= seatsLeft
                      ? "Больше мест на этот сеанс нет"
                      : `Полный от 14 лет — ${rub(FULL_PRICE)}, детский — ${rub(CHILD_PRICE)}`}
                </span>
              </div>
            </Step>

            <Step id="contact" n={3} title="Контакты">
              <div className="max-w-[440px]">
                <div className="field" data-invalid={show("email") && !!emailError}>
                  <label htmlFor="email">Email для билетов</label>
                  <input id="email" type="email" inputMode="email" autoComplete="email" placeholder="anna@mail.ru"
                    value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => touch("email")} />
                </div>
                {show("email") && emailError
                  ? <p className="field-error">{emailError}</p>
                  : <p className="mt-1.5 text-[13px] text-muted">Один адрес на заказ: пришлём билеты всех участников.</p>}
              </div>
            </Step>
          </>
        )}
      </div>

      {/* Правая колонка на десктопе */}
      <aside className="hidden lg:sticky lg:top-4 lg:block">
        <div className="card p-6">
          {summaryCard}
          {stage !== "soldout" && (
            <>
              {serverError && stage === "review" && <div className="mt-4"><Notice tone="danger">{serverError}</Notice></div>}
              <PrimaryAction stage={stage} submitting={submitting} total={summary.total} onNext={toReview} onConfirm={confirm} />
              {stage === "review" && (
                <button className="btn-line mt-2 w-full" onClick={() => goToSection("people")}>Изменить данные</button>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Нижняя панель на телефоне */}
      {stage !== "soldout" && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur lg:hidden"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))" }}>
          <div className="container-x flex items-center gap-3 pt-3">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-muted">
                {summary.full + summary.child} {plural(summary.full + summary.child, "билет", "билета", "билетов")}
              </p>
              <p className="text-[22px] font-extrabold leading-tight tabular-nums">{rub(summary.total)}</p>
            </div>
            <PrimaryAction compact stage={stage} submitting={submitting} total={summary.total} onNext={toReview} onConfirm={confirm} />
          </div>
          {serverError && stage === "review" && <p className="container-x pt-2 text-[13px] font-semibold text-danger">{serverError}</p>}
        </div>
      )}
    </div>
  );
}

function PrimaryAction(props: {
  stage: Stage; submitting: boolean; total: number; compact?: boolean; onNext: () => void; onConfirm: () => void;
}) {
  const cls = props.compact ? "btn-primary h-13 px-5 text-[16px]" : "btn-primary mt-5 w-full";
  if (props.stage === "review") {
    return (
      <button className={cls} onClick={props.onConfirm} disabled={props.submitting}>
        {props.submitting ? <><Spinner /> Оформляем…</> : <>Подтвердить заказ</>}
      </button>
    );
  }
  return <button className={cls} onClick={props.onNext}>Проверить заказ <Arrow /></button>;
}

function Step({ id, n, title, aside, children }: { id: string; n: number; title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-4 p-5 sm:p-6">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="flex items-baseline gap-3 text-[20px] font-extrabold">
          <span className="font-display text-[14px] font-medium text-brand tabular-nums">0{n}</span>
          {title}
        </h2>
        {aside && <span className="text-[14px] font-semibold text-muted tabular-nums">{aside}</span>}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function OrderSummary({ event, sessionLabel, full, child, total }: {
  event: Event; sessionLabel: string; full: number; child: number; total: number;
}) {
  return (
    <div>
      <p className="eyebrow">Ваш заказ</p>
      <p className="mt-2 text-[17px] font-extrabold leading-snug">{event.title}</p>
      <p className="mt-1 text-[14px] first-letter:uppercase text-muted">{sessionLabel}</p>
      {event.place && <p className="text-[14px] text-muted">{event.place}</p>}
      <dl className="mt-4 flex flex-col gap-2 border-t border-dashed border-line pt-4 text-[15px] tabular-nums">
        <Row label={`Полный × ${full}`} value={rub(full * FULL_PRICE)} muted={full === 0} />
        <Row label={`Детский × ${child}`} value={rub(child * CHILD_PRICE)} muted={child === 0} />
      </dl>
      <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
        <span className="text-[16px] font-bold">Итого</span>
        <span className="font-display text-[26px] font-bold tabular-nums">{rub(total)}</span>
      </div>
    </div>
  );
}

const Row = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
  <div className={`flex justify-between ${muted ? "text-muted/70" : ""}`}>
    <dt>{label}</dt>
    <dd className="font-semibold">{value}</dd>
  </div>
);

function Review({ event, people, email, sessionLabel, total, onEdit }: {
  event: Event; people: ParticipantDraft[]; email: string; sessionLabel: string; total: number; onEdit: (id: string) => void;
}) {
  const Edit = ({ to }: { to: string }) => (
    <button className="text-[14px] font-bold text-brand hover:underline" onClick={() => onEdit(to)}>Изменить</button>
  );
  return (
    <section className="card rise p-5 sm:p-6" aria-labelledby="review-title">
      <p className="eyebrow">Последний шаг</p>
      <h2 id="review-title" className="mt-1 font-display text-[24px] font-bold uppercase sm:text-[28px]">Проверьте заказ</h2>

      <div className="mt-5 divide-y divide-line">
        <div className="flex items-start justify-between gap-4 py-4">
          <div>
            <p className="eyebrow">Мероприятие</p>
            <p className="mt-1 text-[17px] font-extrabold">{event.title}</p>
            <p className="text-[15px] text-muted first-letter:uppercase">{sessionLabel}</p>
            {event.address && <p className="text-[15px] text-muted">{event.place}, {event.address}</p>}
          </div>
          <Edit to="sessions" />
        </div>

        <div className="py-4">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Участники</p>
            <Edit to="people" />
          </div>
          <ul className="mt-2 flex flex-col gap-2">
            {people.map((p) => {
              const age = parseAge(p.age)!;
              return (
                <li key={p.key} className="flex items-center justify-between gap-3 rounded-xl bg-mist px-4 py-3 tabular-nums">
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{p.name.trim()}</span>
                    <span className="text-[14px] text-muted">
                      {age} {plural(age, "год", "года", "лет")} · {ticketType(age) === "child" ? "детский" : "полный"}
                    </span>
                  </span>
                  <span className="font-bold">{rub(ticketPrice(age))}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex items-start justify-between gap-4 py-4">
          <div className="min-w-0">
            <p className="eyebrow">Билеты придут на</p>
            <p className="mt-1 break-all text-[17px] font-bold">{email.trim()}</p>
          </div>
          <Edit to="contact" />
        </div>

        <div className="flex items-baseline justify-between pt-4">
          <span className="text-[17px] font-bold">К оплате</span>
          <span className="font-display text-[28px] font-bold tabular-nums">{rub(total)}</span>
        </div>
      </div>
    </section>
  );
}

function SoldOut({ event, wanted, left, tz, currentId, onSession, onEdit, onSessions }: {
  event: Event; wanted: number; left: number; tz: string; currentId: string | null;
  onSession: (id: string) => void; onEdit: () => void; onSessions: () => void;
}) {
  const alternatives = event.sessions.filter((s) => s.id !== currentId && s.seats_left >= wanted).slice(0, 3);
  return (
    <section className="card rise overflow-hidden" role="alert">
      <div className="bg-danger-50 px-5 py-6 sm:px-6">
        <p className="eyebrow text-danger">Заказ не оформлен</p>
        <h2 className="mt-1 font-display text-[24px] font-bold uppercase leading-tight text-ink sm:text-[30px]">
          Места закончились
        </h2>
        <p className="mt-2 max-w-[52ch] text-[16px] text-ink/80">
          Пока вы заполняли данные, билеты на этот сеанс купили.{" "}
          {left > 0
            ? `Осталось ${seatsText(left)}, а в заказе ${wanted}.`
            : "Свободных мест не осталось."}{" "}
          Деньги не списаны, данные участников сохранены.
        </p>
      </div>
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        {alternatives.length > 0 && (
          <div>
            <p className="text-[15px] font-bold">Оформить тот же заказ на другую дату</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {alternatives.map((s) => (
                <button key={s.id} onClick={() => onSession(s.id)}
                  className="rounded-2xl border-2 border-line px-4 py-3 text-left transition hover:border-brand tabular-nums">
                  <span className="block text-[16px] font-extrabold">{dayShort(s.starts_at, tz)}, {time(s.starts_at, tz)}</span>
                  <span className="text-[13px] font-bold text-ok">
                    {s.seats_left <= LOW_SEATS ? `Осталось ${seatsText(s.seats_left)}` : "Есть места"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {left > 0 && <button className="btn-ghost" onClick={onEdit}>Оставить {left} {plural(left, "участника", "участников", "участников")}</button>}
          <button className="btn-line" onClick={onSessions}>Выбрать другую дату</button>
        </div>
      </div>
    </section>
  );
}
