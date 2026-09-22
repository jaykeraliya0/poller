import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { DemoBoard } from "@/components/marketing/demo-board";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6 sm:px-10">
        <Link href="/" className="-my-2 flex min-h-11 items-center self-start rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/35">
          <Logo />
        </Link>
        <main id="main" tabIndex={-1} className="flex flex-1 items-start justify-center py-10 outline-none sm:items-center">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
      <div className="relative hidden overflow-hidden bg-signal lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-8 lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:repeating-linear-gradient(90deg,white_0_2px,transparent_2px_28px)]"
          aria-hidden
        />
        <DemoBoard className="relative w-full max-w-md" />
        <p className="relative max-w-md text-center text-[0.9375rem] text-primary-foreground/85">
          Share one link. Poller counts the votes and tells you what the group decided.
        </p>
      </div>
    </div>
  );
}
