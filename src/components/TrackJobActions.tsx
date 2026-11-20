"use client";

import { useEffect, useState } from "react";
import type { NormalizedJob } from "@/lib/ats/types";
import { linkedinPeopleSearchUrl } from "@/lib/outreach/recruiters";
import { fetchApplications, trackApplication } from "@/lib/tracking/client";
import type { ApplicationStatus } from "@/lib/tracking/types";
import { AppliedButton } from "./AppliedButton";

const PIPELINE: ApplicationStatus[] = [
  "applied",
  "interviewing",
  "offer",
  "rejected",
];

export function TrackJobActions({ job }: { job: NormalizedJob }) {
  const [busy, setBusy] = useState<"saved" | null>(null);
  const [done, setDone] = useState<"saved" | "applied" | null>(null);
  const [pipelineStatus, setPipelineStatus] =
    useState<ApplicationStatus | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"supabase" | "local" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { applications } = await fetchApplications();
      if (cancelled) return;
      const hit = applications.find((a) => a.job_id === job.id);
      if (!hit) return;
      setAppId(hit.id);
      if (PIPELINE.includes(hit.status)) {
        setDone("applied");
        setPipelineStatus(hit.status);
        setMessage(
          hit.status === "applied"
            ? "Already in your tracker as applied — tap Applied again to remove"
            : `Already tracked as ${hit.status} — tap the pill again to remove`,
        );
      } else if (hit.status === "saved") {
        setDone("saved");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [job.id]);

  async function trackSaved() {
    setBusy("saved");
    setMessage("");
    try {
      const result = await trackApplication({
        jobId: job.id,
        title: job.title,
        company: job.companyName,
        applyUrl: job.applyUrl,
        location: job.locationText,
        status: "saved",
      });
      setDone("saved");
      setAppId(result.application.id);
      setMode(result.mode);
      setMessage(
        result.mode === "local"
          ? "Saved on this device"
          : "Saved to your tracker",
      );
    } catch {
      setMessage("Could not update tracker");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {pipelineStatus ? (
        <p className="rounded-xl border border-jade/30 bg-jade/10 px-3 py-2 text-sm font-medium text-ink">
          You already{" "}
          {pipelineStatus === "applied"
            ? "applied"
            : `marked this as ${pipelineStatus}`}
          {" · tap Applied again to undo · "}
          <a href="/tracker" className="text-gold underline">
            Open tracker
          </a>
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={trackSaved}
          disabled={busy !== null || done === "saved" || done === "applied"}
          className="focus-ring rounded-full border border-[var(--line)] bg-porcelain px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-60"
        >
          {done === "saved" || done === "applied"
            ? "Saved"
            : busy === "saved"
              ? "Saving…"
              : "Save"}
        </button>
        <AppliedButton
          job={job}
          initialStatus={pipelineStatus}
          initialId={appId}
          className="!px-4 !py-2.5 !text-sm"
          onChange={(status, id) => {
            if (!status) {
              setDone(null);
              setPipelineStatus(null);
              setAppId(null);
              setMessage("Removed from tracker");
              return;
            }
            setDone("applied");
            setPipelineStatus(status);
            setAppId(id);
            setMessage("Marked applied — it’s in your tracker");
          }}
        />
        <a
          href={linkedinPeopleSearchUrl(
            `("product design" OR design OR university) (recruiter OR "talent acquisition") "${job.companyName}"`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring rounded-full border border-gold/40 bg-chartreuse/15 px-4 py-2.5 text-sm font-medium text-ink"
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
