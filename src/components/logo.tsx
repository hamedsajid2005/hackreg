import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The official Zelvora Technologies logo, used exactly as supplied.
 *
 * The source artwork is a square PNG authored on a pure black plate, so it is
 * always presented inside a dark container (`.logo-plate`) at its native aspect
 * ratio — never recoloured, cropped, stretched or redrawn.
 *
 * To swap in a new official file: replace /public/zelvora-logo.png. Nothing else
 * in the codebase needs to change.
 */
export function ZelvoraLogo({
  size = 44,
  className,
  priority = false,
  rounded = "rounded-xl",
}: {
  size?: number;
  className?: string;
  priority?: boolean;
  rounded?: string;
}) {
  return (
    <span
      className={cn("logo-plate shrink-0", rounded, className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/zelvora-logo.png"
        alt="Zelvora Technologies Pvt. Ltd."
        width={size}
        height={size}
        priority={priority}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

export function BrandLockup({
  size = 44,
  subtitle = "Zelvora Technologies Pvt. Ltd.",
  className,
  priority = false,
}: {
  size?: number;
  subtitle?: string | null;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <ZelvoraLogo size={size} priority={priority} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[15px] font-bold tracking-[0.14em] text-white">
          ZELVORA REGISTRATION PORTAL
        </span>
        {subtitle ? (
          <span className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.14em] text-brand-300/80">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
