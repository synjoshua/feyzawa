"use client";

import { useMemo, useState } from "react";
import type { CompanyAllowlistEntry } from "@/lib/ats/types";

type WatchItem = {
  id?: string;
  company_name: string;
  provider?: string | null;
  board_token?: string | null;
};

export function WatchlistPanel({
  allowlist,
  initial,
  configured,
  signedIn,
}: {
  allowlist: CompanyAllowlistEntry[];
  initial: WatchItem[];
  configured: boolean;
  signedIn: boolean;
}) {
  const [items, setItems] = useState<WatchItem[]>(initial);
  const [message, setMessage] = useState("");

  const watchedNames = useMemo(
    () => new Set(items.map((i) => i.company_name)),
    [items],
  );

  const sortedAllowlist = useMemo(() => {
    return [...allowlist].sort((a, b) => {
      const aWatched = watchedNames.has(a.name) ? 0 : 1;
      const bWatched = watchedNames.has(b.name) ? 0 : 1;
      if (aWatched !== bWatched) return aWatched - bWatched;
      return a.name.localeCompare(b.name);
    });
  }, [allowlist, watchedNames]);

  async function toggle(company: CompanyAllowlistEntry) {
    if (!configured || !signedIn) {
      setMessage("Sign in to save your watchlist to your account.");
      return;
    }
    setMessage("");
    if (watchedNames.has(company.name)) {
      const res = await fetch(
        `/api/watchlist?company=${encodeURIComponent(company.name)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || "Could not remove — try refreshing");
        return;
      }
      setItems((prev) => prev.filter((i) => i.company_name !== company.name));
      setMessage(`Removed ${company.name}. Home will match after you refresh.`);
      return;
    }

    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: company.name,
        provider: company.provider,
        boardToken: company.boardToken,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || "Could not add — try refreshing");
      return;
    }
    const data = await res.json();
    setItems((prev) => [...prev, data.item as WatchItem]);
    setMessage(`Watching ${company.name}.`);
  }

  async function clearAll() {
    if (!configured || !signedIn) {
      setMessage("Sign in to manage your watchlist.");
      return;
    }
    setMessage("");
    const res = await fetch("/api/watchlist?all=1", { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || "Could not clear watchlist");
      return;
    }
    setItems([]);
    setMessage("Watchlist cleared. Home Company watch is empty until you Watch again.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-soft">
          {items.length === 0
            ? "None watched — tap Watch to pin a company on home."
            : `${items.length} watched`}
        </p>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="focus-ring rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-ink-soft hover:border-gold hover:text-ink"
          >
            Clear all
          </button>
        ) : null}
      </div>
      {message ? (
        <p className="text-sm text-amber">{message}</p>
      ) : null}
      <ul className="tea-surface divide-y divide-[var(--line)] overflow-hidden rounded-tea">
        {sortedAllowlist.map((company) => {
          const watched = watchedNames.has(company.name);
          return (
            <li
              key={`${company.provider}-${company.boardToken}`}
              className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div>
                <p className="font-semibold text-ink">{company.name}</p>
                <p className="text-xs capitalize text-ink-soft">
                  {company.provider} · board <code>{company.boardToken}</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggle(company)}
                className={`focus-ring rounded-lg px-3 py-2 text-xs font-medium ${
                  watched
                    ? "bg-ink text-white"
                    : "border border-[var(--line)] bg-white text-ink-soft"
                }`}
              >
                {watched ? "Watching" : "Watch"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
