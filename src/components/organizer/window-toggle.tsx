"use client";

import * as React from "react";
import { Loader2, LockKeyhole, UnlockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setRegistrationWindow } from "@/app/organizer/actions";

export function WindowToggle({ open }: { open: boolean }) {
  const [pending, setPending] = React.useState(false);

  const toggle = async () => {
    setPending(true);
    const result = await setRegistrationWindow(!open);
    setPending(false);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  };

  return (
    <Button
      variant={open ? "secondary" : "primary"}
      size="sm"
      onClick={toggle}
      disabled={pending}
      title={open ? "Close registration" : "Open registration"}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : open ? (
        <LockKeyhole className="h-3.5 w-3.5" />
      ) : (
        <UnlockKeyhole className="h-3.5 w-3.5" />
      )}
      {open ? "Close registration" : "Open registration"}
    </Button>
  );
}
