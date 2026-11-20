import { HEADER_BAND_MIN, HEADER_SHELL } from "./HeaderFrame";

/** Instant shell while a route’s RSC payload is still loading. */
export function RouteLoading({
  title = "Loading",
}: {
  title?: string;
}) {
  return (
    <div className="min-h-screen bg-[#f2e8de]">
      <section className="relative z-20 overflow-visible bg-[#2c2827] text-porcelain">
        <div className={`${HEADER_SHELL} ${HEADER_BAND_MIN}`}>
          <div className="flex items-start justify-between gap-3">
            <p className="brand-mark text-[2.35rem] leading-none text-porcelain/80 sm:text-[3.5rem]">
              Feyzawa
            </p>
            <div className="flex gap-2 pt-2">
              <span className="hidden h-8 w-16 animate-pulse rounded-full bg-white/10 sm:block" />
              <span className="hidden h-8 w-16 animate-pulse rounded-full bg-white/10 sm:block" />
              <span className="h-8 w-20 animate-pulse rounded-full bg-[#e5bf55]/40" />
            </div>
          </div>
          <div className="mt-auto pt-5">
            <div className="h-[4.25rem] sm:h-[4.75rem]">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#e5bf55]/70">
                &nbsp;
              </p>
              <p className="brand-mark mt-1 text-[2rem] text-porcelain sm:text-[2.75rem]">
                {title}
              </p>
            </div>
          </div>
        </div>
      </section>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="space-y-3">
          <div className="h-4 w-2/3 max-w-md animate-pulse rounded bg-[#d9cfc3]/70" />
          <div className="h-28 animate-pulse rounded-[1.25rem] bg-[#d9cfc3]/50" />
          <div className="h-28 animate-pulse rounded-[1.25rem] bg-[#d9cfc3]/40" />
        </div>
      </main>
    </div>
  );
}
