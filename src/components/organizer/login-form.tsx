"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Mail, ShieldAlert } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const denied = params.get("error") === "not_authorized";

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabase();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError("Those credentials are not valid.");
        return;
      }
      router.replace("/organizer");
      router.refresh();
    } catch {
      setError("Sign-in is unavailable. Check the Supabase configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {denied ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12.5px] text-amber-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            That account is not on the organizer allow-list. Ask an existing organizer to add your
            user ID to <code className="text-amber-100">zelvation.organizer_users</code>.
          </span>
        </div>
      ) : null}

      <div>
        <Label htmlFor="email" required>
          Organizer email
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@zelvora.com"
            className="pl-9"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="password" required>
          Password
        </Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="pl-9"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-[12.5px] font-medium text-red-400">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Sign in to organizer dashboard
      </Button>

      <p className="text-center text-[11.5px] leading-relaxed text-slate-500">
        Organizer accounts are created by Zelvora Technologies. There is no public sign-up.
      </p>
    </form>
  );
}
