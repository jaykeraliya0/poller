import Link from "next/link";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonLinkProps = React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>;

/**
 * A real link styled as a button. Base UI's Button adds role="button" to
 * whatever it renders, which would hide navigation from screen readers.
 */
export function ButtonLink({ className, variant, size, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
