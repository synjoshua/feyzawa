"use client";

import { useEffect, useState } from "react";
import type { NormalizedJob } from "@/lib/ats/types";
import {
  fetchApplications,
  removeApplication,
  trackApplication,
} from "@/lib/tracking/client";
import { resolveAppJobId } from "@/lib/tracking/app-utils";
import type { ApplicationStatus } from "@/lib/tracking/types";

const PIPELINE: ApplicationStatus[] = [
  "applied",
  "interviewing",
  "offer",
  "rejected",
];

type Props = {
  job: NormalizedJob;
  className?: string;
  /** undefined = unknown; null = known unsaved */
  initialSavedId?: string | null;
  onChange?: (saved: boolean, id: string | null) => void;
};

export function BookmarkButton({
  job,
  className = "",
  initialSavedId,
  onChange,
}: Props) {
  const known = initialSavedId !== undefined;
  const [savedId, setSavedId] = useState<string | null>(
    known ? initialSavedId : null,
  );
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    if (known) {
      setSavedId(initialSavedId ?? null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { applications } = await fetchApplications();
      if (cancelled) return;
      const hit = applications.find((a) => {
        if (a.status !== "saved") return false;
        const key = resolveAppJobId(a);
        if (key && key === job.id) return true;
        return (
          a.company_snapshot.toLowerCase() === job.companyName.toLowerCase() &&
          a.title_snapshot.toLowerCase() === job.title.toLowerCase()
        );
      });
      setSavedId(hit?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [known, initialSavedId, job.id, job.companyName, job.title]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setHint("");

    if (savedId) {
      const prev = savedId;
      setSavedId(null);
      onChange?.(false, null);
      const ok = await removeApplication(prev, job.id);
      if (!ok) {
        setSavedId(prev);
        onChange?.(true, prev);
        setHint("Could not remove");
      }
      setBusy(false);
      return;
    }

    const tempId = `opt_save_${job.id}`;
    setSavedId(tempId);
    onChange?.(true, tempId);

    try {
      const { application } = await trackApplication({
        jobId: job.id,
        title: job.title,
        company: job.companyName,
        applyUrl: job.applyUrl,
        location: job.locationText,
        status: "saved",
      });
      if (PIPELINE.includes(application.status) || application.status !== "saved") {
        setSavedId(null);
        onChange?.(false, null);
        setHint("Already in tracker");
        return;
      }
      setSavedId(application.id);
      onChange?.(true, application.id);
    } catch {
      setSavedId(null);
      onChange?.(false, null);
      setHint("Sign in to save across devices");
    } finally {
      setBusy(false);
    }
  }

  const filled = Boolean(savedId);

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={filled}
        aria-label={filled ? "Remove bookmark" : "Save job"}
        className={`focus-ring flex h-9 w-9 items-center justify-center rounded-full border transition disabled:opacity-60 ${
          filled
            ? "border-[#c9a85a] bg-[#f2e8de] text-ink"
            : "border-[var(--line)] bg-porcelain text-ink-soft hover:border-[#c9a85a] hover:text-ink"
        }`}
      >
        <BookmarkIcon filled={filled} />
      </button>
      {hint ? (
        <span className="mt-1 max-w-[7rem] text-center text-[10px] text-ink-soft">
          {hint}{" "}
          {hint.includes("Sign in") ? (
            <a href="/login" className="text-gold underline">
              Sign in
            </a>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      {filled ? (
        <path
          fill="currentColor"
          d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"
        />
      ) : (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
          d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"
        />
      )}
    </svg>
  );
}
