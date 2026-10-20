"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";

import { createTag } from "./actions";

/** New tag: a name; the colour is the theme's next chart slot (recolour it in the list). */
export function LabelForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createTag(orgId, { name });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setName("");
      toast({
        title: result.created
          ? `Created tag “${result.tag.name}”`
          : `“${result.tag.name}” is already a tag`,
        tone: result.created ? "success" : "default",
      });
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <label htmlFor="tag-name" className="sr-only">
        New tag
      </label>
      <Input
        id="tag-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New tag, like catering"
        required
        maxLength={60}
        className="w-64"
      />
      <Button type="submit" variant="create" disabled={isPending || !name.trim()}>
        <Plus className="size-4" aria-hidden="true" />
        {isPending ? "Adding…" : "Add tag"}
      </Button>
      {error && (
        <p role="alert" className="text-destructive w-full text-sm">
          {error}
        </p>
      )}
    </form>
  );
}
