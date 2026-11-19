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

  async function toggle(company: CompanyAllowlistEntry) {
    if (!configured || !signedIn) {
      setMessage("Sign in with Supabase to persist your watchlist.");
      return;
    }
    setMessage("");
    if (watchedNames.has(company.name)) {
      const res = await fetch(
        `/api/watchlist?company=${encodeURIComponent(company.name)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        setMessage("Could not remove");
        return;
      }
      setItems((prev) => prev.filter((i) => i.company_name !== company.name));
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
      setMessage(data.error || "Could not add");
      return;
    }
    const data = await res.json();
    setItems((prev) => [...prev, data.item as WatchItem]);
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="text-sm text-amber">{message}</p>
      ) : null}
      <ul className="tea-surface divide-y divide-[var(--line)] overflow-hidden rounded-tea">
        {allowlist.map((company) => {
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
