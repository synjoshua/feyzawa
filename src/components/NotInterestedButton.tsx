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
  /** undefined = unknown (fetch); null = known not active */
  initialId?: string | null;
  initialActive?: boolean;
  onChange?: (active: boolean, id: string | null) => void;
};

export function NotInterestedButton({
  job,
  className = "",
  initialId,
  initialActive,
  onChange,
}: Props) {
  const known = initialActive !== undefined;
  const [appId, setAppId] = useState<string | null>(
    known && initialActive ? (initialId ?? null) : null,
  );
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    if (known) {
      setAppId(initialActive ? (initialId ?? null) : null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { applications } = await fetchApplications();
      if (cancelled) return;
      const hit = applications.find((a) => {
        if (a.status !== "not_interested") return false;
        const key = resolveAppJobId(a);
        if (key && key === job.id) return true;
        return (
          a.company_snapshot.toLowerCase() === job.companyName.toLowerCase() &&
          a.title_snapshot.toLowerCase() === job.title.toLowerCase()
        );
      });
      setAppId(hit?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [known, initialActive, initialId, job.id, job.companyName, job.title]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setHint("");

    // Undo — hide from list / clear immediately
    if (appId) {
      const prev = appId;
      setAppId(null);
      onChange?.(false, null);
      const ok = await removeApplication(prev, job.id);
      if (!ok) {
        setAppId(prev);
        onChange?.(true, prev);
        setHint("Could not undo");
      }
      setBusy(false);
      return;
    }

    // Mark — parent can remove from board before the network returns
    const tempId = `opt_skip_${job.id}`;
    setAppId(tempId);
    onChange?.(true, tempId);

    try {
      const { application, mode, syncError } = await trackApplication({
        jobId: job.id,
        title: job.title,
        company: job.companyName,
        applyUrl: job.applyUrl,
        location: job.locationText,
        status: "not_interested",
      });
      if (PIPELINE.includes(application.status)) {
        setAppId(null);
        onChange?.(false, null);
        setHint("Already in tracker");
        return;
      }
      if (application.status !== "not_interested") {
        setAppId(null);
        onChange?.(false, null);
        setHint("Already in tracker");
        return;
      }
      setAppId(application.id);
      onChange?.(true, application.id);
      if (syncError || mode === "local") {
        setHint("Saved on this device — account sync pending");
      }
    } catch {
      setAppId(null);
      onChange?.(false, null);
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
        stroke={filled ? "var(--porcelain, #fffdf8)" : "currentColor"}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
