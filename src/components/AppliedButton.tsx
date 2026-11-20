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
  /** undefined = unknown (hydrate once); null = known not applied */
  initialStatus?: ApplicationStatus | null;
  initialId?: string | null;
  onChange?: (status: ApplicationStatus | null, id: string | null) => void;
  className?: string;
};

export function AppliedButton({
  job,
  initialStatus,
  initialId,
  onChange,
  className = "",
}: Props) {
  const known = initialStatus !== undefined;
  const [status, setStatus] = useState<ApplicationStatus | null>(
    known ? initialStatus : null,
  );
  const [appId, setAppId] = useState<string | null>(
    known ? (initialId ?? null) : null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (known) {
      setStatus(initialStatus);
      setAppId(initialId ?? null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { applications } = await fetchApplications();
      if (cancelled) return;
      const hit =
        applications.find(
          (a) => a.job_id === job.id && PIPELINE.includes(a.status),
        ) ?? applications.find((a) => a.job_id === job.id);
      if (hit) {
        setStatus(hit.status);
        setAppId(hit.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [job.id, known, initialStatus, initialId]);

  async function clearApplied() {
    const prevStatus = status;
    const prevId = appId;
    setStatus(null);
    setAppId(null);
    onChange?.(null, null);
    setBusy(true);
    try {
      if (prevId) await removeApplication(prevId, job.id);
      else await removeApplication("", job.id);
    } catch {
      setStatus(prevStatus);
      setAppId(prevId);
      onChange?.(prevStatus, prevId);
    } finally {
      setBusy(false);
    }
  }

  async function markApplied() {
    const existingId = appId;
    const tempId = existingId ?? `opt_applied_${job.id}`;
    setStatus("applied");
    setAppId(tempId);
    onChange?.("applied", tempId);
    setBusy(true);
    try {
      if (existingId && !existingId.startsWith("opt_")) {
        const result = await patchApplication(existingId, { status: "applied" });
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
    } catch {
      setStatus(null);
      setAppId(null);
      onChange?.(null, null);
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
      {marked ? `${labelFor(status)} ✓` : "Mark applied"}
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
