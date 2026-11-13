import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 active:scale-[0.99]",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-gradient text-ink-950 shadow-[0_10px_30px_-12px_rgba(6,244,237,0.65)] hover:brightness-110",
        secondary:
          "border border-white/15 bg-white/[0.04] text-white hover:border-brand-500/40 hover:bg-white/[0.08]",
        ghost: "text-slate-300 hover:bg-white/[0.06] hover:text-white",
        outline:
          "border border-brand-500/40 text-brand-200 hover:bg-brand-500/10 hover:text-white",
        danger: "bg-red-500/90 text-white hover:bg-red-500",
        link: "text-brand-300 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3.5 text-[13px]",
        md: "h-11 px-5",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
