"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/tracker";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");
    try {
      const supabase = createBrowserSupabaseClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      setStatus("sent");
      setMessage("Check your email for a magic link.");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error
          ? err.message
          : "Supabase is not configured in this environment.",
      );
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 space-y-4 rounded-2xl border border-[var(--line)] bg-white/60 p-5 shadow-panel"
    >
      <label className="block text-sm">
        <span className="text-ink-soft">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
          placeholder="you@example.com"
        />
      </label>
      <button
        type="submit"
        disabled={status === "sending"}
        className="focus-ring w-full rounded-xl bg-moss px-4 py-2.5 text-sm font-medium text-white hover:bg-moss-deep disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Email me a magic link"}
      </button>
      {message ? (
        <p
          className={`text-sm ${status === "error" ? "text-clay" : "text-moss-deep"}`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
