"use client";

import { useEffect, useState } from "react";
import type { NormalizedJob } from "@/lib/ats/types";
import { linkedinPeopleSearchUrl } from "@/lib/outreach/recruiters";
import { fetchApplications, trackApplication } from "@/lib/tracking/client";
import type { ApplicationStatus } from "@/lib/tracking/types";

const PIPELINE: ApplicationStatus[] = [
  "applied",
  "interviewing",
  "offer",
  "rejected",
];

export function TrackJobActions({ job }: { job: NormalizedJob }) {
  const [busy, setBusy] = useState<"saved" | "applied" | null>(null);
  const [done, setDone] = useState<"saved" | "applied" | null>(null);
  const [pipelineStatus, setPipelineStatus] =
    useState<ApplicationStatus | null>(null);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"supabase" | "local" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { applications } = await fetchApplications();
      if (cancelled) return;
      const hit = applications.find((a) => a.job_id === job.id);
      if (!hit) return;
      if (PIPELINE.includes(hit.status)) {
        setDone("applied");
        setPipelineStatus(hit.status);
        setMessage(
          hit.status === "applied"
            ? "Already in your tracker as applied"
            : `Already tracked as ${hit.status}`,
        );
      } else if (hit.status === "saved") {
        setDone("saved");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [job.id]);

  async function track(status: "saved" | "applied") {
    setBusy(status);
    setMessage("");
    try {
      const result = await trackApplication({
        jobId: job.id,
        title: job.title,
        company: job.companyName,
        applyUrl: job.applyUrl,
        location: job.locationText,
        status,
      });
      setDone(status);
      if (status === "applied") setPipelineStatus("applied");
      setMode(result.mode);
      setMessage(
        status === "applied"
          ? result.mode === "local"
            ? "Marked applied — open Tracker (saved on this device; sign in to sync)"
            : "Marked applied — it’s in your tracker"
          : result.mode === "local"
            ? "Saved on this device"
            : "Saved to your tracker",
      );
    } catch {
      setMessage("Could not update tracker");
    } finally {
      setBusy(null);
    }
  }

  const appliedLabel =
    pipelineStatus === "interviewing"
      ? "Interviewing ✓"
      : pipelineStatus === "offer"
        ? "Offer ✓"
        : pipelineStatus === "rejected"
          ? "Rejected ✓"
          : "Applied ✓";

  return (
    <div className="flex flex-col gap-2">
      {pipelineStatus ? (
        <p className="rounded-xl border border-jade/30 bg-jade/10 px-3 py-2 text-sm font-medium text-ink">
          You already {pipelineStatus === "applied" ? "applied" : `marked this as ${pipelineStatus}`}
          {" · "}
          <a href="/tracker" className="text-gold underline">
            Open tracker
          </a>
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => track("saved")}
          disabled={busy !== null || done === "saved" || done === "applied"}
          className="focus-ring rounded-full border border-[var(--line)] bg-porcelain px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-60"
        >
          {done === "saved" || done === "applied"
            ? "Saved"
            : busy === "saved"
              ? "Saving…"
              : "Save"}
        </button>
        <button
          type="button"
          onClick={() => track("applied")}
          disabled={busy !== null || done === "applied"}
          className={`focus-ring rounded-full px-4 py-2.5 text-sm font-medium disabled:opacity-90 ${
            done === "applied"
              ? "bg-jade text-porcelain"
              : "bg-jade px-4 text-porcelain"
          }`}
        >
          {done === "applied"
            ? appliedLabel
            : busy === "applied"
              ? "Saving…"
              : "I already applied"}
        </button>
        <a
          href={`/outreach?company=${encodeURIComponent(job.companyName)}&role=${encodeURIComponent(job.title)}&jobId=${encodeURIComponent(job.id)}`}
          className="focus-ring rounded-full border border-gold/40 bg-chartreuse/15 px-4 py-2.5 text-sm font-medium text-ink"
        >
          Find recruiters
        </a>
        <a
          href={linkedinPeopleSearchUrl(
            `("product design" OR design OR university) (recruiter OR "talent acquisition") "${job.companyName}"`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring rounded-full border border-[var(--line)] bg-porcelain px-4 py-2.5 text-sm font-medium text-ink"
        >
          Search LinkedIn
        </a>
      </div>
      {message ? (
        <p className="text-xs text-ink-soft">
          {message}
          {mode === "local" ? (
            <>
              {" "}
              · <a href="/tracker" className="text-gold underline">Open tracker</a>
              {" · "}
              <a href="/login" className="text-gold underline">
                Sign in
              </a>{" "}
              to sync across devices
            </>
          ) : (
            <>
              {" "}
              · <a href="/tracker" className="text-gold underline">Open tracker</a>
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}
