import { EqualIcon, HourglassIcon, TrophyIcon, CircleSlashIcon, TrendingUpIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Outcome } from "@/lib/insights/outcome";

/** Status-style badge: always an icon plus text, never colour alone. */
export function OutcomeBadge({ outcome, open }: { outcome: Outcome; open: boolean }) {
  switch (outcome.kind) {
    case "LEADER":
      return open ? (
        <Badge>
          <TrendingUpIcon aria-hidden /> Leading
        </Badge>
      ) : (
        <Badge>
          <TrophyIcon aria-hidden /> Winner
        </Badge>
      );
    case "TIE":
      return (
        <Badge variant="secondary">
          <EqualIcon aria-hidden /> Tie
        </Badge>
      );
    case "TOO_FEW":
      return (
        <Badge variant="outline">
          <HourglassIcon aria-hidden /> {open ? "Early results" : "Too few votes"}
        </Badge>
      );
    case "NO_SUPPORT":
      return (
        <Badge variant="outline">
          <CircleSlashIcon aria-hidden /> No clear option
        </Badge>
      );
    case "NO_VOTES":
      return <Badge variant="outline">{open ? "No votes yet" : "No votes"}</Badge>;
  }
}
