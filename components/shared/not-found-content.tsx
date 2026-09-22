import { ButtonLink } from "@/components/shared/button-link";

/** Big, calm "nothing here" message shared by every not-found boundary. */
export function NotFoundContent() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <p className="font-display text-[5rem] leading-none font-extrabold text-signal" aria-hidden>
          404
        </p>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl font-bold">Page not found</h1>
          <p className="text-muted-foreground">This poll may have been deleted, or the link is mistyped.</p>
        </div>
        <ButtonLink href="/" size="lg">
          Go home
        </ButtonLink>
      </div>
    </div>
  );
}
