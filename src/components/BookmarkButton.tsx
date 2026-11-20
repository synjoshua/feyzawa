"use client";

import { useEffect, useState } from "react";
import type { NormalizedJob } from "@/lib/ats/types";
import {
  fetchApplications,
  removeApplication,
  trackApplication,
} from "@/lib/tracking/client";
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
  /** Preloaded saved application id from parent */
  initialSavedId?: string | null;
  /** Called after save/unsave so parent can refresh */
  onChange?: (saved: boolean, id: string | null) => void;
};

export function BookmarkButton({
  job,
  className = "",
  initialSavedId = null,
  onChange,
}: Props) {
  const [savedId, setSavedId] = useState<string | null>(initialSavedId);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    if (initialSavedId) {
      setSavedId(initialSavedId);
      return;
    }
    let cancelled = false;
    (async () => {
      const { applications } = await fetchApplications();
      if (cancelled) return;
      const hit = applications.find(
        (a) => a.job_id === job.id && a.status === "saved",
      );
      setSavedId(hit?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [job.id, initialSavedId]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setHint("");
    try {
      if (savedId) {
        const ok = await removeApplication(savedId, job.id);
        if (!ok) {
          setHint("Could not remove");
          return;
        }
        setSavedId(null);
        onChange?.(false, null);
        return;
      }

      // Don't create a "saved" row over an applied/pipeline entry
      const { applications } = await fetchApplications();
      const existing = applications.find((a) => a.job_id === job.id);
      if (existing && PIPELINE.includes(existing.status)) {
        setHint("Already in tracker");
        return;
      }

      const { application } = await trackApplication({
        jobId: job.id,
        title: job.title,
        company: job.companyName,
        applyUrl: job.applyUrl,
        location: job.locationText,
        status: "saved",
      });
      // If server refused downgrade, status may still be pipeline
      if (application.status !== "saved") {
        setHint("Already in tracker");
        onChange?.(false, null);
        return;
      }
      setSavedId(application.id);
      onChange?.(true, application.id);
    } catch {
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
            ? "border-gold bg-[#e5bf55]/35 text-ink"
            : "border-[var(--line)] bg-porcelain text-ink-soft hover:border-gold hover:text-ink"
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
