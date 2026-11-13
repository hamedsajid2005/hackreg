"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getPaymentStatus } from "@/lib/api";

/**
 * While a registration is pending, poll the server-verified status and refresh
 * the page the moment the webhook confirms payment. The gateway redirect is
 * never trusted — this reads the database row only.
 */
export function PendingWatcher({ token }: { token: string }) {
  const router = useRouter();
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await getPaymentStatus(token);
        if (cancelled) return;
        if (res.registration_status === "confirmed" && res.team_id) {
          router.replace(`/confirmation/${token}?verified=1`);
          return;
        }
      } catch {
        /* ignore transient errors, keep polling */
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    tick();
    const id = window.setInterval(tick, 6000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [token, router]);

  return (
    <p className="no-print mt-6 flex items-center gap-2 text-[12px] text-slate-400">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-400" />
      {checking ? "Checking payment status…" : "Watching for gateway confirmation — this page updates automatically."}
    </p>
  );
}
