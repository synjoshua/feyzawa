import { experienceLabel, workStyleLabel } from "@/lib/format";

export function ExperienceBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-porcelain px-2.5 py-0.5 text-[11px] font-medium text-ink-soft ring-1 ring-inset ring-[var(--line)]">
      {experienceLabel(value)}
    </span>
  );
}

export function WorkStyleBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-matcha/10 px-2.5 py-0.5 text-[11px] font-medium text-ink-soft ring-1 ring-inset ring-matcha/25">
      {workStyleLabel(value)}
    </span>
  );
}

export function StatusBadge({ value }: { value: string }) {
  if (value === "potentially_closed") {
    return (
      <span className="inline-flex items-center rounded-full bg-clay/10 px-2.5 py-0.5 text-[11px] font-medium text-clay ring-1 ring-inset ring-clay/20">
        Maybe closed
      </span>
    );
  }
  return null;
}
