"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import type { NormalizedJob } from "@/lib/ats/types";
import { relativeTime } from "@/lib/format";
import {
  EligibilityBadge,
  ExperienceBadge,
  StatusBadge,
  WorkStyleBadge,
} from "./Badges";
import {
  IconCalifornia,
  IconIntern,
  IconOutreach,
  IconRemote,
  IconTracker,
  IconWatch,
} from "./HomeIcons";

type Props = {
  initialJobs: NormalizedJob[];
  updatedAt: string | null;
  source: string;
  companies: string[];
  watchedCompanies: string[];
  signedIn?: boolean;
};

type QuickKey =
  | "all"
  | "intern"
  | "new_grad"
  | "junior"
  | "confirmed"
  | "california"
  | "remote"
  | "product";

const CATEGORY_CHIPS: { key: QuickKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "intern", label: "Intern" },
  { key: "new_grad", label: "New grad" },
  { key: "junior", label: "Junior" },
  { key: "confirmed", label: "Confirmed" },
  { key: "california", label: "California" },
  { key: "remote", label: "Remote" },
  { key: "product", label: "Product" },
];

export function DenseHome({
  initialJobs,
  updatedAt,
  source,
  companies,
  watchedCompanies,
  signedIn = false,
}: Props) {
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<QuickKey>("all");
  const [company, setCompany] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");
  const router = useRouter();

  async function refreshJobs() {
    setRefreshing(true);
    setRefreshMsg("Fetching Greenhouse / Lever / Ashby…");
    try {
      const res = await fetch("/api/jobs/refresh", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRefreshMsg(data.error || "Refresh failed");
        return;
      }
      setRefreshMsg(
        `Updated · ${data.activeCount ?? 0} active design roles`,
      );
      router.refresh();
    } catch {
      setRefreshMsg("Network error while refreshing");
    } finally {
      setRefreshing(false);
    }
  }

  const activeJobs = useMemo(
    () => initialJobs.filter((j) => j.status === "active"),
    [initialJobs],
  );

  const companyCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const job of activeJobs) {
      map.set(job.companyName, (map.get(job.companyName) ?? 0) + 1);
    }
    return map;
  }, [activeJobs]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return initialJobs.filter((job) => {
      if (!showClosed && job.status !== "active") return false;
      if (query) {
        const hay =
          `${job.title} ${job.companyName} ${job.locationText}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      if (company && job.companyName !== company) return false;

      switch (chip) {
        case "intern":
          return job.isInternship || job.experienceBand === "intern";
        case "new_grad":
          return job.experienceBand === "new_grad";
        case "junior":
          return (
            job.experienceBand === "junior" ||
            job.experienceBand === "associate"
          );
        case "confirmed":
          return job.eligibility === "confirmed";
        case "california":
          return job.isCalifornia;
        case "remote":
          return job.isRemote;
        case "product":
          return /product/i.test(job.title);
        default:
          return true;
      }
    });
  }, [initialJobs, q, chip, company, showClosed]);

  const featured = filtered.slice(0, 8);
  const internCount = activeJobs.filter((j) => j.isInternship).length;
  const caCount = activeJobs.filter((j) => j.isCalifornia).length;
  const remoteCount = activeJobs.filter((j) => j.isRemote).length;
  const confirmedCount = activeJobs.filter(
    (j) => j.eligibility === "confirmed",
  ).length;

  function applyQuick(next: QuickKey) {
    startTransition(() => setChip(next));
  }

  function runSearch(e: FormEvent) {
    e.preventDefault();
    document.getElementById("open-roles")?.scrollIntoView({ behavior: "smooth" });
  }

  const shortcuts = [
    {
      label: "Internships",
      count: internCount,
      icon: "intern" as const,
      onClick: () => applyQuick("intern"),
    },
    {
      label: "California",
      count: caCount,
      icon: "california" as const,
      onClick: () => applyQuick("california"),
    },
    {
      label: "Remote",
      count: remoteCount,
      icon: "remote" as const,
      onClick: () => applyQuick("remote"),
    },
    {
      label: "Tracker",
      count: null as number | null,
      icon: "tracker" as const,
      href: "/tracker",
    },
  ];

  function ShortcutIcon({ name }: { name: (typeof shortcuts)[number]["icon"] }) {
    const cls = "h-7 w-7";
    switch (name) {
      case "intern":
        return <IconIntern className={cls} />;
      case "california":
        return <IconCalifornia className={cls} />;
      case "remote":
        return <IconRemote className={cls} />;
      case "tracker":
        return <IconTracker className={cls} />;
    }
  }

  const closedCount = initialJobs.filter(
    (j) => j.status === "potentially_closed",
  ).length;

  function countForFilter(key: QuickKey): number {
    switch (key) {
      case "intern":
        return internCount;
      case "new_grad":
        return activeJobs.filter((j) => j.experienceBand === "new_grad").length;
      case "junior":
        return activeJobs.filter(
          (j) =>
            j.experienceBand === "junior" || j.experienceBand === "associate",
        ).length;
      case "confirmed":
        return confirmedCount;
      case "california":
        return caCount;
      case "remote":
        return remoteCount;
      case "product":
        return activeJobs.filter((j) => /product/i.test(j.title)).length;
      case "all":
      default:
        return activeJobs.length;
    }
  }

  // Same keys/order as chips (skip All) so highlight maps 1:1 left→right
  const filterStats = CATEGORY_CHIPS.filter((c) => c.key !== "all").map(
    (c) => ({
      key: c.key,
      label: c.label,
      count: countForFilter(c.key),
    }),
  );

  return (
    <div className="pb-16">
      {/* Flat lacquer brown header — solid fill, no gradient */}
      <section className="relative overflow-hidden bg-[#2c2827] text-porcelain">
        <div className="relative mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#e5bf55]">
                Design hunt
              </p>
              <h1 className="brand-mark mt-1 truncate text-[2.85rem] leading-none text-porcelain sm:text-[3.5rem]">
                Feyzawa
              </h1>
            </div>
            <nav className="flex shrink-0 items-center gap-0.5 pt-1 text-xs sm:gap-1 sm:text-sm">
              <Link
                href="/watchlist"
                className="focus-ring rounded-full px-2.5 py-1.5 text-porcelain/80 hover:bg-white/10 hover:text-porcelain"
              >
                Watch
              </Link>
              <Link
                href="/tracker"
                className="focus-ring rounded-full px-2.5 py-1.5 text-porcelain/80 hover:bg-white/10 hover:text-porcelain"
              >
                Tracker
              </Link>
              <Link
                href="/outreach"
                className="focus-ring rounded-full px-2.5 py-1.5 text-porcelain/80 hover:bg-white/10 hover:text-porcelain"
              >
                Outreach
              </Link>
              <Link
                href={signedIn ? "/profile" : "/login"}
                className="focus-ring rounded-full bg-[#e5bf55]/90 px-2.5 py-1.5 font-medium text-ink hover:bg-[#e5bf55]"
              >
                {signedIn ? "Profile" : "Sign in"}
              </Link>
            </nav>
          </div>

          <form
            onSubmit={runSearch}
            className="mt-6 flex items-center gap-2 rounded-full bg-porcelain p-1 pl-4 shadow-soft"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Title, company, location…"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft/50"
              aria-label="Search roles"
            />
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="hidden max-w-[9rem] truncate rounded-full bg-[#f2e8de] px-2 py-1.5 text-xs text-ink sm:block"
              aria-label="Company"
            >
              <option value="">Company</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="focus-ring shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-medium text-porcelain"
            >
              Search
            </button>
          </form>

          <div className="mt-7 grid grid-cols-4 gap-2 pb-8 sm:gap-4">
            {shortcuts.map((item) => {
              const inner = (
                <>
                  <span className="flex h-11 w-11 items-center justify-center text-[#e5bf55]">
                    <ShortcutIcon name={item.icon} />
                  </span>
                  <span className="text-[11px] font-medium leading-tight text-porcelain/90 sm:text-xs">
                    {item.label}
                  </span>
                  {item.count !== null ? (
                    <span className="text-[10px] tabular-nums text-porcelain/55">
                      {item.count}
                    </span>
                  ) : null}
                </>
              );
              const className =
                "focus-ring flex flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-center transition hover:bg-white/5";
              return "href" in item && item.href ? (
                <Link key={item.label} href={item.href} className={className}>
                  {inner}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className={className}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-6xl px-3 sm:px-6">
        <section className="animate-pour overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-porcelain shadow-panel">
          {/* Group 1: filter chips — one job, same control type */}
          <div className="flex gap-1 overflow-x-auto border-b border-[var(--line)] px-3 pt-3 scrollbar-thin">
            {CATEGORY_CHIPS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => applyQuick(c.key)}
                className={`focus-ring shrink-0 border-b-2 px-3 pb-2.5 text-sm transition ${
                  chip === c.key
                    ? "border-gold font-semibold text-ink"
                    : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="space-y-5 p-4 sm:p-5">
            {/* Group 2: role counts — similarity + proximity (all number tiles) */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
                Role counts
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {filterStats.map((stat) => (
                  <button
                    key={stat.key}
                    type="button"
                    onClick={() => applyQuick(stat.key)}
                    className={`focus-ring rounded-xl border px-3 py-3 text-left transition ${
                      chip === stat.key
                        ? "border-gold bg-[#e5bf55]/25"
                        : "border-[var(--line)] bg-[#f2e8de]/50 hover:border-gold/40"
                    }`}
                  >
                    <p className="text-xl font-semibold tabular-nums text-ink">
                      {stat.count}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">{stat.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Group 3: board scope — common region, separated from filters */}
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-4">
              <button
                type="button"
                onClick={() => applyQuick("all")}
                className={`focus-ring rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  chip === "all" && !showClosed
                    ? "bg-ink text-porcelain"
                    : "border border-[var(--line)] bg-porcelain text-ink hover:border-gold/40"
                }`}
              >
                All roles · {activeJobs.length}
              </button>
              <button
                type="button"
                onClick={() => setShowClosed((v) => !v)}
                className={`focus-ring rounded-full px-3.5 py-2 text-sm transition ${
                  showClosed
                    ? "bg-ink text-porcelain"
                    : "border border-[var(--line)] text-ink-soft hover:border-gold/40 hover:text-ink"
                }`}
              >
                {showClosed ? "Hiding closed" : `Maybe closed · ${closedCount}`}
              </button>
            </div>

            {/* Group 4: your tools — icons only, never mixed with counts */}
            <div className="border-t border-[var(--line)] pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
                Your tools
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Link
                  href="/watchlist"
                  className="focus-ring flex flex-col items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[#f2e8de]/40 px-2 py-3 text-center transition hover:border-gold/45"
                >
                  <IconWatch className="h-6 w-6 text-[#6f675f]" />
                  <span className="text-xs font-medium text-ink">Watchlist</span>
                  <span className="text-[10px] text-ink-soft">
                    {watchedCompanies.length} companies
                  </span>
                </Link>
                <Link
                  href="/outreach"
                  className="focus-ring flex flex-col items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[#f2e8de]/40 px-2 py-3 text-center transition hover:border-gold/45"
                >
                  <IconOutreach className="h-6 w-6 text-[#6f675f]" />
                  <span className="text-xs font-medium text-ink">Outreach</span>
                  <span className="text-[10px] text-ink-soft">Recruiters</span>
                </Link>
                <Link
                  href="/tracker"
                  className="focus-ring flex flex-col items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[#f2e8de]/40 px-2 py-3 text-center transition hover:border-gold/45"
                >
                  <IconTracker className="h-6 w-6 text-[#6f675f]" />
                  <span className="text-xs font-medium text-ink">Tracker</span>
                  <span className="text-[10px] text-ink-soft">Applications</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Status strip + live refresh */}
        <div className="animate-pour stagger-1 mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] bg-porcelain/90 px-3 py-2.5 text-sm text-ink-soft shadow-soft">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-chartreuse/25 text-xs text-gold">
            ●
          </span>
          <p className="min-w-0 flex-1">
            <span className="font-semibold text-ink">{filtered.length}</span> roles
            {pending ? " · steeping…" : ""}
            {updatedAt
              ? ` · verified ${relativeTime(updatedAt)} · ${source}`
              : " · not refreshed yet"}
            {refreshMsg ? (
              <span className="mt-0.5 block text-xs text-ink">{refreshMsg}</span>
            ) : (
              <span className="mt-0.5 block text-xs">
                Pull latest design listings from your company allowlist anytime.
              </span>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {(q || chip !== "all" || company || showClosed) && (
              <button
                type="button"
                onClick={() => {
                  startTransition(() => {
                    setQ("");
                    setChip("all");
                    setCompany("");
                    setShowClosed(false);
                  });
                }}
                className="focus-ring text-xs text-gold underline-offset-2 hover:underline"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={refreshJobs}
              disabled={refreshing}
              className="focus-ring rounded-full bg-jade px-3.5 py-1.5 text-xs font-medium text-porcelain disabled:opacity-60"
            >
              {refreshing ? "Refreshing…" : "Refresh jobs"}
            </button>
          </div>
        </div>

        {/* Featured / open roles */}
        <section id="open-roles" className="animate-pour stagger-2 mt-5 scroll-mt-4">
          <div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
            <h2 className="brand-display text-2xl text-ink sm:text-3xl">
              Open roles
            </h2>
            <span className="text-xs text-ink-soft">
              {filtered.length} matching
            </span>
          </div>

          <ul className="tea-surface divide-y divide-[var(--line)] overflow-hidden rounded-[1.25rem]">
            {featured.length === 0 ? (
              <li className="px-4 py-12 text-center text-sm text-ink-soft">
                No matching roles — reset filters or refresh allowlist boards.
              </li>
            ) : (
              featured.map((job) => (
                <li key={job.id} className="job-row">
                  <div className="flex flex-col gap-2.5 px-3.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="focus-ring truncate text-[15px] font-medium text-ink hover:text-gold"
                        >
                          {job.title}
                        </Link>
                        <StatusBadge value={job.status} />
                      </div>
                      <p className="truncate text-xs text-ink-soft sm:text-sm">
                        {job.companyName}
                        {job.locationText ? ` · ${job.locationText}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <EligibilityBadge value={job.eligibility} />
                        <ExperienceBadge value={job.experienceBand} />
                        <WorkStyleBadge value={job.workStyle} />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="focus-ring rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-ink-soft"
                      >
                        Details
                      </Link>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="focus-ring rounded-full border border-gold/40 bg-chartreuse/15 px-3 py-1.5 text-xs text-ink"
                      >
                        Applied?
                      </Link>
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="focus-ring rounded-full bg-jade px-3 py-1.5 text-xs font-medium text-porcelain"
                      >
                        Apply
                      </a>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>

          {filtered.length > featured.length ? (
            <p className="mt-2 text-center text-xs text-ink-soft">
              Showing top {featured.length} of {filtered.length} — scroll for
              full board
            </p>
          ) : null}
        </section>

        {/* Company watch */}
        <section className="animate-pour stagger-3 mt-6">
          <div className="mb-2 flex items-baseline justify-between px-0.5">
            <h2 className="brand-display text-2xl text-ink">Company watch</h2>
            <Link href="/watchlist" className="text-xs text-gold hover:underline">
              Manage →
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {watchedCompanies.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  startTransition(() => {
                    setCompany(name);
                    setChip("all");
                  });
                  document
                    .getElementById("open-roles")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`focus-ring shrink-0 rounded-2xl border px-3.5 py-2.5 text-left transition ${
                  company === name
                    ? "border-jade bg-jade text-porcelain"
                    : "border-[var(--line)] bg-porcelain hover:border-gold/50"
                }`}
              >
                <p className="text-sm font-medium">{name}</p>
                <p
                  className={`text-[11px] ${company === name ? "text-porcelain/80" : "text-ink-soft"}`}
                >
                  {companyCounts.get(name) ?? 0} open
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Tracker entry */}
        <Link
          href="/tracker"
          className="focus-ring mt-5 flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-gradient-to-r from-foam to-porcelain px-4 py-3.5 shadow-soft transition hover:border-gold/45"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-jade text-sm font-semibold text-porcelain">
            T
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">
              Application tracker
            </span>
            <span className="block text-xs text-ink-soft">
              Saved · Applied · Interviewing · Offer · Rejected — private notes
            </span>
          </span>
          <span className="text-gold">→</span>
        </Link>

        {/* Full board remainder */}
        <section id="board" className="mt-8 scroll-mt-4">
          <div className="mb-2 flex items-baseline justify-between px-0.5">
            <h2 className="brand-display text-2xl text-ink sm:text-3xl">
              Full board
            </h2>
            <span className="text-xs text-ink-soft">
              {filtered.length} roles
            </span>
          </div>
          <ul className="tea-surface divide-y divide-[var(--line)] overflow-hidden rounded-[1.25rem]">
            {filtered.map((job) => (
              <li key={`full-${job.id}`} className="job-row">
                <div className="flex flex-col gap-2 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                  <div className="min-w-0">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="focus-ring text-sm font-medium text-ink hover:text-gold"
                    >
                      {job.title}
                    </Link>
                    <p className="truncate text-xs text-ink-soft">
                      {job.companyName}
                      {job.locationText ? ` · ${job.locationText}` : ""}
                      {" · "}
                      verified {relativeTime(job.lastVerifiedAt)}
                    </p>
                  </div>
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-porcelain"
                  >
                    Apply
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
