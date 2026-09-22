import { Badge } from "@/components/ui/badge";

/** Marks options the organiser added after this voter last voted. */
export function NewOptionBadge() {
  return (
    <Badge variant="secondary" className="shrink-0">
      New
    </Badge>
  );
}
