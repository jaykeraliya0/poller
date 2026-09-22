"use client";

import { useRef, useSyncExternalStore } from "react";
import { CheckIcon, CopyIcon, ExternalLinkIcon, Share2Icon } from "lucide-react";
import { toast } from "sonner";
import { ButtonLink } from "@/components/shared/button-link";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

const subscribeNoop = () => () => {};

/** Web Share support, read without a hydration mismatch (false on the server). */
function useCanShare() {
  return useSyncExternalStore(
    subscribeNoop,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
}

type SharePanelProps = { url: string; title: string; className?: string };

export function SharePanel({ url, title, className }: SharePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { copied, copy } = useCopyToClipboard();
  const canShare = useCanShare();

  const onCopy = async () => {
    if (await copy(url)) {
      toast.success("Link copied");
    } else {
      // Fall back to selecting the text so the user can copy it manually.
      inputRef.current?.select();
      toast.info("Press and hold (or Ctrl+C) to copy the selected link");
    }
  };

  const onShare = async () => {
    try {
      await navigator.share({ title, text: `Vote on "${title}"`, url });
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") onCopy();
    }
  };

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div className="flex h-11 items-center gap-1 rounded-[10px] border border-input bg-panel p-1 pl-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
        <input
          ref={inputRef}
          readOnly
          value={url}
          aria-label="Poll link"
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 bg-transparent font-mono text-[0.8125rem] text-foreground outline-none"
        />
        <Button type="button" size="sm" onClick={onCopy} className="h-8 shrink-0 px-3">
          {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {canShare && (
          <Button type="button" variant="outline" size="sm" onClick={onShare} className="h-8">
            <Share2Icon data-icon="inline-start" />
            Share
          </Button>
        )}
        <ButtonLink href={url} target="_blank" variant="ghost" size="sm" className="h-8 text-muted-foreground">
          <ExternalLinkIcon data-icon="inline-start" aria-hidden />
          Open voting page
        </ButtonLink>
      </div>
    </div>
  );
}
