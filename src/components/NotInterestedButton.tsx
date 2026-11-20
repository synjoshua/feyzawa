"use client";

import { useEffect, useState } from "react";
import type { NormalizedJob } from "@/lib/ats/types";
import {
  fetchApplications,
  removeApplication,
  trackApplication,
} from "@/lib/tracking/client";
import { resolveAppJobId } from "@/lib/tracking/app-utils";
import type {
  ApplicationRecord,
  ApplicationStatus,
} from "@/lib/tracking/types";

const PIPELINE: ApplicationStatus[] = [
  "applied",
  "interviewing",
  "offer",
  "rejected",
];

type Props = {
  job: NormalizedJob;
  className?: string;
  initialId?: string | null;
  initialActive?: boolean;
  onChange?: (active: boolean, id: string | null) => void;
};

function findNotInterested(
  applications: ApplicationRecord[],
  job: NormalizedJob,
) {
  return applications.find((a) => {
    if (a.status !== "not_interested") return false;
    const key = resolveAppJobId(a);
    if (key && key === job.id) return true;
    return (
      a.company_snapshot.toLowerCase() === job.companyName.toLowerCase() &&
      a.title_snapshot.toLowerCase() === job.title.toLowerCase()
    );
  });
}

export function NotInterestedButton({
  job,
  className = "",
  initialId = null,
  initialActive = false,
  onChange,
}: Props) {
  const [appId, setAppId] = useState<string | null>(
    initialActive ? initialId : null,
  );
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    setAppId(initialActive ? initialId : null);
  }, [initialActive, initialId]);

  useEffect(() => {
    if (initialActive && initialId) return;
    let cancelled = false;
    (async () => {
      const { applications } = await fetchApplications();
      if (cancelled) return;
      const hit = findNotInterested(applications, job);
      setAppId(hit?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [job.id, job.companyName, job.title, initialActive, initialId]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setHint("");
    try {
      if (appId) {
        const ok = await removeApplication(appId, job.id);
        if (!ok) {
          setHint("Could not undo");
          return;
        }
        setAppId(null);
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
        status: "not_interested",
      });
      if (application.status !== "not_interested") {
        setHint("Already in tracker");
        onChange?.(false, null);
        return;
      }
      setAppId(application.id);
      onChange?.(true, application.id);
    } catch {
      setHint("Could not update");
    } finally {
      setBusy(false);
    }
  }

  const active = Boolean(appId);

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={active}
        aria-label={active ? "Add back to board" : "Not interested"}
        title={active ? "Add back to board" : "Not interested"}
        className={`focus-ring flex h-9 w-9 items-center justify-center rounded-full border transition disabled:opacity-60 ${
          active
            ? "border-[#b0a69a] bg-[#ebe6df] text-ink-soft"
            : "border-[var(--line)] bg-porcelain text-ink-soft hover:border-[#b0a69a] hover:text-ink"
        }`}
      >
        <CircleCrossIcon filled={active} />
      </button>
      {hint ? (
        <span className="mt-1 max-w-[8rem] text-center text-[10px] text-ink-soft">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function CircleCrossIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="8.25"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M9 9l6 6M15 9l-6 6"
        fill="none"
        stroke={filled ? "var(--porcelain, #f7f3ec)" : "currentColor"}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
