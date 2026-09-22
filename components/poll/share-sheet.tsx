"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PartyPopperIcon, Share2Icon } from "lucide-react";
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
  const router = useRouter();
  const pathname = usePathname();

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    // Drop ?created=1 so a refresh doesn't reopen the celebration.
    if (!next && justCreated) router.replace(pathname, { scroll: false });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="lg" className="h-11" />}>
        <Share2Icon data-icon="inline-start" />
        Share
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {justCreated && <PartyPopperIcon className="size-5 text-primary" aria-hidden />}
            {justCreated ? "Your poll is live" : "Share this poll"}
          </DialogTitle>
          <DialogDescription>Anyone with this link can vote{justCreated ? ". Send it to your group." : "."}</DialogDescription>
        </DialogHeader>
        <SharePanel url={url} title={title} />
      </DialogContent>
    </Dialog>
  );
}
