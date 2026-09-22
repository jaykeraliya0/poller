import { cn } from "@/lib/utils";

/** Three result bars, the leader in the signal colour: the tally board in miniature. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-7", className)} aria-hidden>
      <rect x="1" y="2" width="22" height="6" rx="3" className="fill-signal" />
      <rect x="1" y="9" width="14.5" height="6" rx="3" className="fill-foreground" />
      <rect x="1" y="16" width="8" height="6" rx="3" className="fill-foreground opacity-35" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-[1.2rem] font-bold">Poller</span>
    </span>
  );
}
