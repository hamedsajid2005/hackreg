"use client";

import * as React from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resendConfirmationEmail } from "@/app/organizer/actions";

export function ResendEmailButton({ registrationId }: { registrationId: string }) {
  const [pending, setPending] = React.useState(false);

  const run = async () => {
    setPending(true);
    const result = await resendConfirmationEmail(registrationId);
    setPending(false);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  };

  return (
    <Button variant="secondary" size="sm" onClick={run} disabled={pending}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
      Resend confirmation email
    </Button>
  );
}
