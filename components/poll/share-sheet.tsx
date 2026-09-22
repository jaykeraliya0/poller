"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Share2Icon } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SharePanel } from "./share-panel";

type ShareSheetProps = {
  url: string;
  title: string;
  /** Opens immediately, e.g. right after the poll was created. */
  defaultOpen?: boolean;
};

export function ShareSheet({ url, title, defaultOpen = false }: ShareSheetProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [justCreated] = useState(defaultOpen);
  const pathname = usePathname();

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    // Drop ?created=1 so a refresh doesn't reopen the celebration. Native history,
    // not router.replace: only the URL changes, so there's no server round trip.
    if (!next && justCreated) window.history.replaceState(null, "", pathname);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="lg" />}>
        <Share2Icon data-icon="inline-start" />
        Share
      </DialogTrigger>
      <DialogContent className="gap-5 sm:max-w-md">
        <DialogHeader className="gap-2">
          {justCreated && <LogoMark className="mb-1 size-9" />}
          <DialogTitle className="font-display text-xl font-bold">
            {justCreated ? "Your poll is live" : "Share this poll"}
          </DialogTitle>
          <DialogDescription>Anyone with this link can vote{justCreated ? ". Send it to your group." : "."}</DialogDescription>
        </DialogHeader>
        <SharePanel url={url} title={title} />
      </DialogContent>
    </Dialog>
  );
}
