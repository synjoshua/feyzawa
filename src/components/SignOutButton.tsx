"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="focus-ring rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-porcelain hover:bg-white/15 disabled:opacity-60"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
