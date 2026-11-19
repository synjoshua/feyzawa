import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader active="/login" />
      <main className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
        <h1 className="brand-display text-4xl text-ink">Sign in</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Magic-link auth via your Supabase project. Application notes stay
          private to your account.
        </p>
        <Suspense
          fallback={
            <div className="mt-8 text-sm text-ink-soft">Loading…</div>
          }
        >
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
