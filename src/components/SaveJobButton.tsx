"use client";

import { useState } from "react";
import type { NormalizedJob } from "@/lib/ats/types";

export function SaveJobButton({ job }: { job: NormalizedJob }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function save() {
    setState("saving");
    setMessage("");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          title: job.title,
          company: job.companyName,
          applyUrl: job.applyUrl,
          location: job.locationText,
          status: "saved",
        }),
      });
      if (res.status === 401) {
        setState("error");
        setMessage("Sign in to save privately.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setState("error");
        setMessage(data.error || "Could not save");
        return;
      }
      setState("saved");
      setMessage("Saved to your tracker");
    } catch {
      setState("error");
      setMessage("Network error");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={save}
        disabled={state === "saving" || state === "saved"}
        className="focus-ring rounded-lg border border-[var(--line)] bg-white/80 px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-60"
      >
        {state === "saved"
          ? "Saved"
          : state === "saving"
            ? "Saving…"
            : "Save to tracker"}
      </button>
      {message ? (
        <span className="text-xs text-ink-soft">
          {message}{" "}
          {state === "error" && message.includes("Sign in") ? (
            <a href="/login" className="text-moss-deep underline">
              Sign in
            </a>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
