"use client";

import { useState } from "react";
import { Download } from "lucide-react";
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
import { cn } from "@/lib/utils";

export function ExportDialog({
  requirementsMarkdown,
  testSuiteMarkdown,
  fileNamePrefix,
}: {
  requirementsMarkdown: string;
  testSuiteMarkdown: string;
  fileNamePrefix: string;
}) {
  const [open, setOpen] = useState(false);
  const [includeRequirements, setIncludeRequirements] = useState(true);
  const [includeTestSuite, setIncludeTestSuite] = useState(true);

  const preview = [
    includeRequirements ? requirementsMarkdown : null,
    includeTestSuite ? testSuiteMarkdown : null,
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");

  function handleCopy() {
    navigator.clipboard.writeText(preview);
  }

  function handleDownload() {
    const blob = new Blob([preview], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileNamePrefix}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export deliverables</DialogTitle>
          <DialogDescription>Markdown, ready to hand to your AI coding tool</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={includeRequirements}
            onClick={() => setIncludeRequirements((v) => !v)}
            className={cn(
              "flex-1 rounded-md border px-3 py-2 text-center text-sm",
              includeRequirements ? "border-primary bg-primary/10" : "border-input",
            )}
          >
            Requirements doc
          </button>
          <button
            type="button"
            aria-pressed={includeTestSuite}
            onClick={() => setIncludeTestSuite((v) => !v)}
            className={cn(
              "flex-1 rounded-md border px-3 py-2 text-center text-sm",
              includeTestSuite ? "border-primary bg-primary/10" : "border-input",
            )}
          >
            Test suite
          </button>
        </div>

        <pre className="max-h-40 overflow-y-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
          {preview || "Select at least one document to preview it here."}
        </pre>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleCopy} disabled={!preview}>
            Copy markdown
          </Button>
          <Button onClick={handleDownload} disabled={!preview}>
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
