"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { FieldShell } from "@/components/forms/field-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/errors";

export type EmailEntry = { key: string; email: string; hasAccount: boolean };

type EmailListEditorProps = {
  label: string;
  description: string;
  entries: EmailEntry[];
  emptyText: string;
  onAdd: (emails: string) => Promise<ActionResult<{ added: number }>>;
  onRemove: (key: string) => Promise<ActionResult>;
  /** Singular noun for toasts: "invite", "member". */
  noun: string;
};

/** Paste-to-add list of people by email, with a remove button per person. */
export function EmailListEditor({ label, description, entries, emptyText, onAdd, onRemove, noun }: EmailListEditorProps) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [errors, setErrors] = useState<string[] | undefined>();
  const [adding, startAdding] = useTransition();
  const [removing, setRemoving] = useState<string | null>(null);
  const [, startRemoving] = useTransition();

  const add = () =>
    startAdding(async () => {
      const result = await onAdd(value);
      if (!result.ok) {
        setErrors(result.fieldErrors?.emails ?? [result.message]);
        return;
      }
      setErrors(undefined);
      setValue("");
      const { added } = result.data;
      toast.success(added === 0 ? "Everyone there was already added" : `Added ${added} ${noun}${added === 1 ? "" : "s"}`);
      router.refresh();
    });

  const remove = (entry: EmailEntry) => {
    setRemoving(entry.key);
    startRemoving(async () => {
      const result = await onRemove(entry.key);
      setRemoving(null);
      if (!result.ok) toast.error(result.message);
      else toast.success(`Removed ${entry.email}`);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <FieldShell label={label} description={description} errors={errors}>
        {(control) => (
          <Textarea
            {...control}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              // Cmd/Ctrl+Enter adds, like sending a message.
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && value.trim()) add();
            }}
            placeholder="ana@example.com, ben@example.com"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            className="min-h-18 font-mono text-[0.8125rem]"
          />
        )}
      </FieldShell>
      <Button type="button" variant="outline" onClick={add} disabled={adding || !value.trim()} className="self-start">
        {adding ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
        Add
      </Button>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-[10px] border">
          {entries.map((entry) => (
            <li key={entry.key} className="flex min-h-11 items-center gap-2 py-1.5 pr-1.5 pl-3">
              <span className="min-w-0 flex-1 truncate text-sm" title={entry.email}>
                {entry.email}
              </span>
              <Badge variant={entry.hasAccount ? "secondary" : "outline"} className="shrink-0">
                {entry.hasAccount ? "Joined" : "Not signed up"}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(entry)}
                disabled={removing === entry.key}
                aria-label={`Remove ${entry.email}`}
              >
                {removing === entry.key ? <Spinner /> : <XIcon />}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
