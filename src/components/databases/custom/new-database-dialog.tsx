"use client";

import {
  FileSpreadsheet,
  Handshake,
  Lightbulb,
  Package,
  Plus,
  Shirt,
  Table2,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { createDatabaseAction } from "@/app/app/[orgSlug]/databases/custom-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/toaster";
import { DATABASE_TEMPLATES } from "@/lib/databases/templates";
import { cn } from "@/lib/utils";
import type { ImportSummary } from "@/server/databases/custom";

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  Table2,
  Users,
  Package,
  Shirt,
  Handshake,
  Lightbulb,
};

/**
 * New database: start from a template, or bring in a spreadsheet (CSV) and
 * get a database with a field per column. Either way it's stored in
 * Bananasplit: nothing to connect or host.
 */
export function NewDatabaseDialog({
  orgId,
  orgSlug,
  trigger,
  defaultMode = "template",
}: {
  orgId: string;
  orgSlug: string;
  trigger?: React.ReactNode;
  defaultMode?: "template" | "import";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"template" | "import">(defaultMode);
  const [templateId, setTemplateId] = useState("blank");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const template = DATABASE_TEMPLATES.find((t) => t.id === templateId)!;

  function create() {
    setError(null);
    start(async () => {
      if (mode === "template") {
        const result = await createDatabaseAction(orgId, {
          name: name || template.defaultName,
          templateId,
        });
        if (result.error || !result.data) {
          setError(result.error ?? "That didn't work.");
          return;
        }
        setOpen(false);
        router.push(`/app/${orgSlug}/databases/${result.data.key}`);
        return;
      }
      if (!file) {
        setError("Choose a CSV file first.");
        return;
      }
      if (file.size > 4 * 1024 * 1024) {
        setError("That file is over 4 MB. Split it, or export fewer columns.");
        return;
      }
      // The file goes to a route handler: a Server Action takes at most 1 MB.
      const body = new FormData();
      body.set("file", file);
      body.set("name", name || file.name.replace(/\.[^.]+$/, ""));
      let result: Partial<ImportSummary> & { error?: string };
      try {
        const res = await fetch(`/app/${orgSlug}/databases/import`, { method: "POST", body });
        result = await res.json().catch(() => ({ error: "The server didn't answer. Try again." }));
      } catch {
        result = { error: "Couldn't reach Bananasplit. Check your connection and try again." };
      }
      if (result.error || !result.key) {
        setError(result.error ?? "That didn't work.");
        return;
      }
      const { rows = 0, fields = 0, skippedCells = 0, key } = result;
      toast({
        title: `Imported ${rows.toLocaleString()} rows`,
        description: `${fields} fields${skippedCells ? `; ${skippedCells} values didn't fit their column and were left empty` : ""}.`,
      });
      setOpen(false);
      router.push(`/app/${orgSlug}/databases/${key}`);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setMode(defaultMode);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus aria-hidden="true" />
            New database
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New database</DialogTitle>
          <DialogDescription>
            Stored in Bananasplit and saved as you type. Only your club can see it, and you choose
            which members.
          </DialogDescription>
        </DialogHeader>

        <Segmented
          label="How to start"
          value={mode}
          onSelect={(v) => setMode(v as "template" | "import")}
          options={[
            { value: "template", label: "Start from a template", icon: Table2 },
            { value: "import", label: "Import a spreadsheet", icon: FileSpreadsheet },
          ]}
        />

        {mode === "template" ? (
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Template">
            {DATABASE_TEMPLATES.map((t) => {
              const Icon = TEMPLATE_ICONS[t.icon] ?? Table2;
              const active = t.id === templateId;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTemplateId(t.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5 ring-primary ring-1"
                      : "hover:bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-lg",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 space-y-0.5">
                    <span className="block text-sm font-medium">{t.name}</span>
                    <span className="text-muted-foreground block text-xs leading-relaxed">
                      {t.description}
                    </span>
                    <span className="text-muted-foreground/80 block truncate text-[11px]">
                      {t.fields.map((f) => f.name).join(" · ")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="hover:bg-muted/40 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center"
            >
              <Upload className="text-muted-foreground size-6" aria-hidden="true" />
              <span className="text-sm font-medium">{file ? file.name : "Choose a CSV file"}</span>
              <span className="text-muted-foreground text-xs">
                From Google Sheets or Excel: File › Download › CSV. The first row is the field
                names; each field&apos;s type is worked out from its values. Up to 10,000 rows.
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !name) setName(f.name.replace(/\.[^.]+$/, ""));
              }}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="new-db-name">Name</Label>
          <Input
            id="new-db-name"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              mode === "template" ? template.defaultName : "Name it after the spreadsheet"
            }
          />
        </div>

        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={create} disabled={pending || (mode === "import" && !file)}>
            {pending
              ? mode === "import"
                ? "Importing…"
                : "Creating…"
              : mode === "import"
                ? "Import"
                : "Create database"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
