"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MAX_BAND_TEXT } from "@/lib/notes/paper";

/**
 * Document mode's header and footer text (Note.headerText / footerText).
 * Left empty, a band shows its default: the title and club on top, the
 * title at the bottom (beside the page number either way).
 */
export function HeaderFooterDialog({
  headerText,
  footerText,
  defaults,
  onSave,
  onClose,
}: {
  headerText: string | null;
  footerText: string | null;
  defaults: { header: string; footer: string };
  onSave: (next: { headerText: string | null; footerText: string | null }) => void;
  onClose: () => void;
}) {
  const [header, setHeader] = useState(headerText ?? "");
  const [footer, setFooter] = useState(footerText ?? "");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ headerText: header.trim() || null, footerText: footer.trim() || null });
            onClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>Header and footer</DialogTitle>
            <DialogDescription>
              Shown on every page and in the PDF. Leave one empty for the default.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="note-header-text" className="text-[13px] font-semibold">
              Header
            </label>
            <Input
              id="note-header-text"
              value={header}
              maxLength={MAX_BAND_TEXT}
              placeholder={defaults.header}
              autoFocus
              onChange={(e) => setHeader(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="note-footer-text" className="text-[13px] font-semibold">
              Footer
            </label>
            <Input
              id="note-footer-text"
              value={footer}
              maxLength={MAX_BAND_TEXT}
              placeholder={defaults.footer}
              onChange={(e) => setFooter(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">The page number stays on the right.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
