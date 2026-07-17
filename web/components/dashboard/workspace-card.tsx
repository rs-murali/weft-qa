"use client";

import Link from "next/link";
import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Workspace } from "@/lib/api";
import { api } from "@/lib/api";
import { WeaveThreads } from "@/components/workspace/weave-threads";
import { mockThreadsForCard } from "@/lib/placeholder-workspace-data";
import { cn } from "@/lib/utils";

function coverageTextClass(pct: number): string {
  if (pct >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string(),
});
type EditFormValues = z.infer<typeof editSchema>;

interface WorkspaceCardProps {
  workspace: Workspace;
  onEdit: (updated: Workspace) => void;
  onDelete: (id: string) => void;
}

export function WorkspaceCard({ workspace, onEdit, onDelete }: WorkspaceCardProps) {
  const coveragePct = workspace.stats.coverage_pct;
  const threads = mockThreadsForCard(workspace);

  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: workspace.name, description: workspace.description },
  });

  async function onEditSubmit(values: EditFormValues) {
    setEditError(null);
    try {
      const updated = await api.updateWorkspace(workspace.id, values);
      onEdit(updated);
      setEditOpen(false);
    } catch {
      setEditError("Could not update workspace. Please try again.");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteWorkspace(workspace.id);
      onDelete(workspace.id);
      setDeleteOpen(false);
    } catch {
      setDeleteError("Could not delete workspace. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="group relative h-full">
      {/* ⋯ button — top-right, fades in on hover or keyboard focus */}
      <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Workspace options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-xs"
              onSelect={(e) => {
                e.preventDefault();
                form.reset({ name: workspace.name, description: workspace.description });
                setEditError(null);
                setEditOpen(true);
              }}
            >
              <Pencil className="size-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs"
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault();
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Card link */}
      <Link
        href={`/workspaces/${workspace.id}`}
        className="flex h-full flex-col gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:border-foreground/20"
      >
        <div className="pr-8">
          <h3 className="text-sm font-semibold">{workspace.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {workspace.description || (
              <span className="italic text-muted-foreground/60">No description</span>
            )}
          </p>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="text-xs text-muted-foreground/70">
            Updated {relativeTime(workspace.updated_at)}
          </span>
          {(threads.length > 0 || coveragePct !== null) && (
            <span className="flex items-center gap-1.5">
              <WeaveThreads threads={threads} size="sm" />
              {coveragePct !== null && (
                <span
                  className={cn(
                    "text-xs font-medium tabular-nums",
                    coverageTextClass(Math.round(coveragePct)),
                  )}
                >
                  {Math.round(coveragePct)}%
                </span>
              )}
            </span>
          )}
        </div>
      </Link>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base">Edit workspace</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {editError && <p className="text-xs text-destructive">{editError}</p>}
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              Delete &ldquo;{workspace.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will permanently delete the workspace and all its requirements, test cases, and
              coverage data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                // Radix closes on click by default — stay open so a failed
                // delete can show its error; success closes explicitly.
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete workspace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
