import type { ReactNode } from "react";

/** Shared lacquer header shell — same width/padding/min-height on every page. */
export const HEADER_SHELL =
  "relative z-20 mx-auto max-w-6xl px-4 pb-5 pt-6 sm:px-6 sm:pb-6";

export const HEADER_BRAND =
  "brand-mark overflow-visible text-[2.35rem] leading-none tracking-[-0.02em] text-porcelain sm:text-[3.5rem] sm:tracking-[-0.045em]";

export const HEADER_BAND_MIN =
  "flex min-h-[11.75rem] flex-col sm:min-h-[13.25rem]";

export function HeaderFrame({
  brand,
  nav,
  below,
}: {
  brand: ReactNode;
  nav: ReactNode;
  below?: ReactNode;
}) {
  return (
    <section className="relative z-20 overflow-visible bg-[#2c2827] text-porcelain">
      <div className={`${HEADER_SHELL} ${HEADER_BAND_MIN}`}>
        <div className="relative z-20 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 pr-2">{brand}</div>
          <div className="relative z-30 flex shrink-0 items-center pt-0.5">
            {nav}
          </div>
        </div>
        {below ? <div className="mt-auto pt-5">{below}</div> : null}
      </div>
    </section>
  );
}
