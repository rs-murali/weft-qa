import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DraftRowState = "pending" | "approved" | "rejected";

export function DraftReviewRow({
  itemKey,
  title,
  meta,
  gherkin,
  state,
  onEdit,
  onReject,
  onApprove,
  onUndo,
}: {
  itemKey: string;
  title: string;
  meta?: string;
  gherkin?: string;
  state: DraftRowState;
  onEdit?: () => void;
  onReject?: () => void;
  onApprove?: () => void;
  onUndo?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-md border p-3.5",
        state === "rejected" && "opacity-50",
        state === "approved" && "border-emerald-500/40 bg-emerald-500/5",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm">
          <span className="mr-1.5 font-mono text-xs text-muted-foreground">{itemKey}</span>
          <span className="font-medium">{title}</span>
        </div>
        {meta && <p className="mt-1 text-xs text-muted-foreground">{meta}</p>}
        {gherkin && (
          <pre className="mt-2 rounded bg-muted p-2 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
            {gherkin}
          </pre>
        )}
      </div>

      <div className="flex shrink-0 items-start gap-2">
        {state === "pending" && (
          <>
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={onReject}>
              Reject
            </Button>
            <Button size="icon-sm" onClick={onApprove} aria-label="Approve">
              ✓
            </Button>
          </>
        )}
        {state === "rejected" && (
          <Button variant="outline" size="sm" onClick={onUndo}>
            Undo
          </Button>
        )}
        {state === "approved" && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            Approved
          </span>
        )}
      </div>
    </div>
  );
}
