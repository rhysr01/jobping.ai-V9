"use client";

import { CheckCircle, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";

function OnboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const refresh = searchParams.get("refresh") === "true";
  const accountId = searchParams.get("accountId");

  const checkOnboardingStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/stripe-connect/get-account?accountId=${accountId}`,
      );
      if (res.ok) {
        const data = await res.json();
        const complete =
          data.account.chargesEnabled && data.account.payoutsEnabled;

        if (complete) {
          // Redirect to dashboard
          router.push(
            `/dashboard?userId=${searchParams.get("userId")}&onboarded=true`,
          );
        } else {
          setError(
            "Onboarding not yet complete. Please finish all required steps.",
          );
          setLoading(false);
        }
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, [accountId, router, searchParams]);

  useEffect(() => {
    if (refresh && accountId) {
      // User was redirected back, check if onboarding is complete
      checkOnboardingStatus();
    } else {
      setLoading(false);
    }
  }, [refresh, accountId, checkOnboardingStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container-page py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center">
          {error ? (
            <>
              <h1 className="text-4xl md:text-5xl font-semibold text-white mb-4">
                Onboarding Incomplete
              </h1>
              <p className="text-xl text-zinc-300 mb-6">{error}</p>
              <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </>
          ) : refresh ? (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-4xl md:text-5xl font-semibold text-white mb-4">
                Redirecting...
              </h1>
              <p className="text-xl text-zinc-300">
                Checking your onboarding status...
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl md:text-5xl font-semibold text-white mb-4">
                Start Onboarding
              </h1>
              <p className="text-xl text-zinc-300 mb-6">
                You need to complete Stripe Connect onboarding to accept
                payments.
              </p>
              <Button href="/dashboard">Go to Dashboard</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      }
    >
      <OnboardContent />
    </Suspense>
  );
}
