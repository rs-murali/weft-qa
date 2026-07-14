import { Button } from "@/components/ui/button";

export function ApproveBar({
  approvedCount,
  rejectedCount,
  onApproveAll,
}: {
  approvedCount: number;
  rejectedCount: number;
  onApproveAll: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-t bg-card px-4 py-3 text-sm">
      <span className="text-muted-foreground">
        {approvedCount} approved, {rejectedCount} rejected
      </span>
      <Button onClick={onApproveAll}>Approve all →</Button>
    </div>
  );
}
