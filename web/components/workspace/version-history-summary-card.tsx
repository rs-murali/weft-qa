import Link from "next/link";
import { Button } from "@/components/ui/button";

export function VersionHistorySummaryCard({
  workspaceId,
  count,
  lastApprovedDate,
}: {
  workspaceId: string;
  count: number;
  lastApprovedDate: string;
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {count} version{count === 1 ? "" : "s"} · last approved {lastApprovedDate}
      </p>
      <Button asChild variant="outline" className="mt-2.5 w-full">
        <Link href={`/workspaces/${workspaceId}/chat?panel=history`}>View history</Link>
      </Button>
    </div>
  );
}
