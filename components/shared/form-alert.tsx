import { CircleAlertIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** Form-level error message; renders nothing when there's no message. */
export function FormAlert({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" aria-live="assertive">
      <CircleAlertIcon aria-hidden />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
