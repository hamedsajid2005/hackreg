"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { required?: boolean }
>(({ className, children, required, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("mb-1.5 block text-[13px] font-medium text-slate-300", className)}
    {...props}
  >
    {children}
    {required ? <span className="ml-0.5 text-brand-400">*</span> : null}
  </LabelPrimitive.Root>
));
Label.displayName = "Label";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-[12.5px] font-medium text-red-400">
      {message}
    </p>
  );
}

export function FieldHint({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-[12px] text-slate-500">{children}</p>;
}
