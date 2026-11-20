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
  /** Preloaded saved application id from parent */
  initialSavedId?: string | null;
  /** Called after save/unsave so parent can refresh */
  onChange?: (saved: boolean, id: string | null) => void;
};

function findSavedForJob(
  applications: {
    id: string;
    job_id: string | null;
    status: ApplicationStatus;
    notes: string;
    company_snapshot: string;
    title_snapshot: string;
  }[],
  job: NormalizedJob,
) {
  return applications.find((a) => {
    if (a.status !== "saved") return false;
    const key = resolveAppJobId(a);
    if (key && key === job.id) return true;
    return (
      a.company_snapshot.toLowerCase() === job.companyName.toLowerCase() &&
      a.title_snapshot.toLowerCase() === job.title.toLowerCase()
    );
  });
}

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
    setSavedId(initialSavedId);
  }, [initialSavedId]);

  useEffect(() => {
    if (initialSavedId) return;
    let cancelled = false;
    (async () => {
      const { applications } = await fetchApplications();
      if (cancelled) return;
      const hit = findSavedForJob(applications, job);
      setSavedId(hit?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [job.id, job.companyName, job.title, initialSavedId]);

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

      const { applications } = await fetchApplications();
      const existing = applications.find((a) => {
        const key = resolveAppJobId(a);
        return key === job.id || a.job_id === job.id;
      });
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
