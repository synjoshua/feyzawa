"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/profile";
  const callbackError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "oauth" | "error"
  >("idle");
  const [message, setMessage] = useState(
    callbackError === "auth_callback"
      ? "Sign-in could not finish. Try Google again, or wait before requesting another magic link."
      : "",
  );

  async function signInWithGoogle() {
    setStatus("oauth");
    setMessage("");
    try {
      const supabase = createBrowserSupabaseClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) {
        setStatus("error");
        setMessage(error.message);
      }
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error
          ? err.message
          : "Supabase is not configured in this environment.",
      );
    }
  }

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
        setMessage(
          error.message.toLowerCase().includes("rate")
            ? "Email sending is temporarily limited. Use Continue with Google, or wait ~1 hour and try magic link again."
            : error.message,
        );
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
    <div className="space-y-4 overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-porcelain p-5 shadow-panel">
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={status === "oauth" || status === "sending"}
        className="focus-ring flex w-full items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[#f2e8de] px-4 py-2.5 text-sm font-medium text-ink hover:border-gold/50 disabled:opacity-60"
      >
        <GoogleGlyph />
        {status === "oauth" ? "Redirecting…" : "Continue with Google"}
      </button>

      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
        <span className="h-px flex-1 bg-[var(--line)]" />
        or email
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
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
          disabled={status === "sending" || status === "oauth"}
          className="focus-ring w-full rounded-full bg-[#2c2827] px-4 py-2.5 text-sm font-medium text-porcelain hover:bg-ink disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Email me a magic link"}
        </button>
      </form>

      <p className="text-[11px] leading-relaxed text-ink-soft">
        Google is best for sharing Feyzawa with friends. Magic link uses
        Supabase email (or your custom SMTP) and can hit rate limits on the free
        mailer.
      </p>

      {message ? (
        <p
          className={`text-sm ${status === "error" ? "text-clay" : "text-gold"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 2.9.7 3.6 1.4l2.4-2.4C16.6 3.8 14.5 3 12 3 7.6 3 4 6.6 4 11s3.6 8 8 8c4.6 0 7.7-3.2 7.7-7.8 0-.5 0-.9-.1-1.2H12z"
      />
    </svg>
  );
}
