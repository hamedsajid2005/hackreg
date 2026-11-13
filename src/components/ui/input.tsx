import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "flex w-full rounded-xl border border-white/12 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-brand-500/60 focus:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:cursor-not-allowed disabled:opacity-60";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={cn(base, "h-11", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(base, "min-h-[104px] resize-y", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, style, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      base,
      "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:16px_16px] bg-[right_0.85rem_center] bg-no-repeat pr-10 [&>option]:bg-ink-850 [&>option]:text-white",
      className,
    )}
    style={{ backgroundColor: "#0A1118", colorScheme: "dark", ...style }}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
