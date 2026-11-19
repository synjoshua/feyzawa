"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/tracker";
  const callbackError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState(
    callbackError === "auth_callback"
      ? "Magic link expired or could not create a session. Request a new one, and open it in the same browser."
      : "",
  );

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
      className="tea-surface mt-8 space-y-4 rounded-tea p-5"
    >
      <label className="block text-sm">
        <span className="text-ink-soft">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="focus-ring mt-1 w-full rounded-full border border-[var(--line)] bg-porcelain px-3 py-2.5"
          placeholder="you@example.com"
        />
      </label>
      <button
        type="submit"
        disabled={status === "sending"}
        className="focus-ring w-full rounded-full bg-jade px-4 py-2.5 text-sm font-medium text-porcelain hover:bg-ink disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Email me a magic link"}
      </button>
      {message ? (
        <p
          className={`text-sm ${status === "error" ? "text-clay" : "text-gold"}`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
