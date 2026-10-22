import { Link, Outlet } from "react-router-dom";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-white" aria-label="На главную">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#fff" />
        <path d="M8 11h16v3a2 2 0 0 0 0 4v3H8v-3a2 2 0 0 0 0-4z" fill="var(--color-brand)" />
      </svg>
      <span className="font-display text-[19px] font-medium tracking-tight">
        sqoch<span className="opacity-60">·</span>билеты
      </span>
    </Link>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-brand">
        <div className="container-x flex h-16 items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-5 text-[15px] font-semibold text-white/90">
            <Link to="/" className="hover:text-white">Афиша</Link>
            <a href="#help" className="hidden hover:text-white sm:inline">Помощь</a>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer id="help" className="mt-16 border-t border-line bg-white">
        <div className="container-x flex flex-col gap-3 py-8 text-[14px] text-muted sm:flex-row sm:justify-between">
          <p>
            Полный билет — 2 000 ₽, с 14 лет. Детский — 1 000 ₽, до 14 лет, только вместе со взрослым от 18 лет.
          </p>
          <p className="shrink-0">Афиша: KudaGo</p>
        </div>
      </footer>
    </div>
  );
}
