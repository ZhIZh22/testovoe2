export interface City { slug: string; name: string; timezone: string }
export interface Session { id: string; starts_at: string; seats_left: number }
export interface Event {
  id: string; title: string; category: string | null; description: string; city: City;
  place: string | null; address: string | null; image: string | null; min_age: number;
  sessions: Session[]; source: "kudago" | "mock"; url: string | null;
}
export interface OrderLine { name: string; age: number; ticket: "full" | "child"; price: number }
export interface Order {
  id: string; event_id: string; event_title: string; session_id: string; starts_at: string;
  email: string; lines: OrderLine[]; total: number; created_at: string;
}

export class ApiError extends Error {
  constructor(public status: number, public detail: any) {
    super(detail?.message ?? `Ошибка ${status}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new ApiError(0, { message: "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз" });
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.detail ?? body);
  return body as T;
}

export const api = {
  cities: () => request<City[]>("/api/cities"),
  events: (city: string) => request<{ source: string; events: Event[] }>(`/api/events?city=${city}`),
  event: (id: string) => request<Event>(`/api/events/${encodeURIComponent(id)}`),
  createOrder: (body: { session_id: string; email: string; participants: { name: string; age: number }[] }, key: string) =>
    request<Order>("/api/orders", { method: "POST", body: JSON.stringify(body), headers: { "Idempotency-Key": key } }),
};
