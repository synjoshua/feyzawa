"use client";

import { useEffect, useState } from "react";
import type { NormalizedJob } from "@/lib/ats/types";
import {
  fetchApplications,
  patchApplication,
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

function labelFor(status: ApplicationStatus | null): string {
  switch (status) {
    case "applied":
      return "Applied";
    case "interviewing":
      return "Interviewing";
    case "offer":
      return "Offer";
    case "rejected":
      return "Rejected";
    default:
      return "Mark applied";
  }
}

type Props = {
  job: NormalizedJob;
  /** Optional preloaded status from a parent fetch */
  initialStatus?: ApplicationStatus | null;
  initialId?: string | null;
  /** null status = cleared / removed from tracker */
  onChange?: (status: ApplicationStatus | null, id: string | null) => void;
  className?: string;
};

export function AppliedButton({
  job,
  initialStatus = null,
  initialId = null,
  onChange,
  className = "",
}: Props) {
  const [status, setStatus] = useState<ApplicationStatus | null>(initialStatus);
  const [appId, setAppId] = useState<string | null>(initialId);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialStatus) {
      setStatus(initialStatus);
      setAppId(initialId);
      return;
    }
    let cancelled = false;
    (async () => {
      const { applications } = await fetchApplications();
      if (cancelled) return;
      const pipeline = applications.find(
        (a) => a.job_id === job.id && PIPELINE.includes(a.status),
      );
      const any = applications.find((a) => a.job_id === job.id);
      const hit = pipeline ?? any;
      if (hit) {
        setStatus(hit.status);
        setAppId(hit.id);
      } else {
        setStatus(null);
        setAppId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [job.id, initialStatus, initialId]);

  async function resolveId(): Promise<string | null> {
    if (appId) return appId;
    const { applications } = await fetchApplications();
    return applications.find((a) => a.job_id === job.id)?.id ?? null;
  }

  async function clearApplied() {
    setBusy(true);
    try {
      const id = await resolveId();
      if (id) {
        await removeApplication(id, job.id);
      } else {
        await removeApplication("", job.id);
      }
      setStatus(null);
      setAppId(null);
      onChange?.(null, null);
    } finally {
      setBusy(false);
    }
  }

  async function markApplied() {
    setBusy(true);
    try {
      const id = await resolveId();

      if (id) {
        const result = await patchApplication(id, { status: "applied" });
        if (result) {
          setStatus(result.application.status);
          setAppId(result.application.id);
          onChange?.(result.application.status, result.application.id);
          return;
        }
      }

      const { application } = await trackApplication({
        jobId: job.id,
        title: job.title,
        company: job.companyName,
        applyUrl: job.applyUrl,
        location: job.locationText,
        status: "applied",
      });
      setStatus(application.status);
      setAppId(application.id);
      onChange?.(application.status, application.id);
    } finally {
      setBusy(false);
    }
  }

  async function toggle() {
    if (busy) return;
    if (status && PIPELINE.includes(status)) {
      await clearApplied();
      return;
    }
    await markApplied();
  }

  const marked = status !== null && PIPELINE.includes(status);

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={marked}
      title={marked ? "Click to remove from tracker" : "Mark as applied"}
      className={`focus-ring rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
        marked
          ? "border border-jade bg-jade text-porcelain hover:border-clay hover:bg-clay hover:text-porcelain"
          : "border border-gold/40 bg-chartreuse/15 text-ink hover:border-gold hover:bg-chartreuse/25"
      } ${className}`}
    >
      {busy
        ? marked
          ? "Removing…"
          : "Saving…"
        : marked
          ? `${labelFor(status)} ✓`
          : "Mark applied"}
    </button>
  );
}

export function AppliedBadge({ status }: { status: ApplicationStatus }) {
  if (!PIPELINE.includes(status)) return null;
  const text =
    status === "applied"
      ? "Applied"
      : status === "interviewing"
        ? "Interviewing"
        : status === "offer"
          ? "Offer"
          : "Rejected";
  return (
    <span className="inline-flex items-center rounded-full bg-jade px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-porcelain">
      {text}
    </span>
  );
}

export function isPipelineStatus(
  status: ApplicationStatus | null | undefined,
): status is ApplicationStatus {
  return Boolean(status && PIPELINE.includes(status));
}
