import {
  eligibilityLabel,
  experienceLabel,
  workStyleLabel,
} from "@/lib/format";

export function EligibilityBadge({ value }: { value: string }) {
  const styles =
    value === "confirmed"
      ? "bg-moss/15 text-moss-deep ring-moss/20"
      : value === "possible"
        ? "bg-amber/15 text-[#7a4a14] ring-amber/25"
        : "bg-black/5 text-ink-soft ring-black/10";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset ${styles}`}
    >
      {eligibilityLabel(value)}
    </span>
  );
}

export function ExperienceBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-medium text-ink-soft ring-1 ring-inset ring-[var(--line)]">
      {experienceLabel(value)}
    </span>
  );
}

export function WorkStyleBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-leaf/10 px-2 py-0.5 text-[11px] font-medium text-moss-deep ring-1 ring-inset ring-leaf/20">
      {workStyleLabel(value)}
    </span>
  );
}

export function StatusBadge({ value }: { value: string }) {
  if (value === "potentially_closed") {
    return (
      <span className="inline-flex items-center rounded-md bg-clay/10 px-2 py-0.5 text-[11px] font-medium text-clay ring-1 ring-inset ring-clay/20">
        Maybe closed
      </span>
    );
  }
  return null;
}
