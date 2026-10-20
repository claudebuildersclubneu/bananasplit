"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";

import { emptyTrashAction } from "./actions";

/** The storage page's one destructive button, with a confirm that names what goes. */
export function EmptyTrashButton({
  orgId,
  items,
  size,
}: {
  orgId: string;
  items: number;
  /** "3.4 GB". */
  size: string;
}) {
  const router = useRouter();
  const [confirmEl, confirm] = useConfirm();

  async function run() {
    let done = { notes: 0, files: 0 };
    const ok = await confirm({
      title: "Empty the trash?",
      description: `${items} ${items === 1 ? "item" : "items"} (${size}) in the trash will be deleted for good. They can't be restored.`,
      confirmLabel: "Empty trash",
      tone: "destructive",
      run: async () => {
        const result = await emptyTrashAction(orgId);
        if (result.error) return result.error;
        done = { notes: result.notes ?? 0, files: result.files ?? 0 };
      },
    });
    if (!ok) return;
    toast({
      title: `Emptied the trash: ${done.notes} ${done.notes === 1 ? "note" : "notes"} and ${done.files} ${done.files === 1 ? "file" : "files"}`,
      tone: "success",
    });
    router.refresh();
  }

  return (
    <>
      <Button variant="destructive" size="sm" disabled={items === 0} onClick={() => void run()}>
        Empty trash
      </Button>
      {confirmEl}
    </>
  );
}
