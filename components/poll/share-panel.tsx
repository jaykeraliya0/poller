"use client";

import { useRef, useSyncExternalStore } from "react";
import { CheckIcon, CopyIcon, ExternalLinkIcon, Share2Icon } from "lucide-react";
import { toast } from "sonner";
import { ButtonLink } from "@/components/shared/button-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

const subscribeNoop = () => () => {};

/** Web Share support, read without a hydration mismatch (false on the server). */
function useCanShare() {
  return useSyncExternalStore(
    subscribeNoop,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
}

type SharePanelProps = { url: string; title: string };

export function SharePanel({ url, title }: SharePanelProps) {
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
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          readOnly
          value={url}
          aria-label="Poll link"
          onFocus={(event) => event.currentTarget.select()}
          className="h-11 font-mono text-sm"
        />
        <Button type="button" variant="outline" size="lg" onClick={onCopy} className="h-11 shrink-0">
          {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {canShare && (
          <Button type="button" size="lg" onClick={onShare} className="h-11 sm:flex-1">
            <Share2Icon data-icon="inline-start" />
            Share
          </Button>
        )}
        <ButtonLink href={url} target="_blank" variant="outline" size="lg" className="h-11 sm:flex-1">
          <ExternalLinkIcon data-icon="inline-start" aria-hidden />
          Open voting page
        </ButtonLink>
      </div>
    </div>
  );
}
