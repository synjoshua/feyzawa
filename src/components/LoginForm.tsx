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

/** Official multicolor Google “G” (Sign in with Google mark). */
function GoogleGlyph() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
