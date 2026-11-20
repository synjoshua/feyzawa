import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <PageShell
      active="/login"
      eyebrow="Account"
      title="Sign in"
      description="Continue with Google for a real profile, or use email magic link. Your applications stay private to your account."
      maxWidthClass="max-w-md"
    >
      <Suspense fallback={<div className="text-sm text-ink-soft">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </PageShell>
  );
}
