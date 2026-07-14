import Link from "next/link";
import { AlertTriangle, XCircle } from "lucide-react";
import type { NeedsAttentionEntry } from "@/lib/placeholder-workspace-data";

export function NeedsAttentionList({
  workspaceId,
  items,
}: {
  workspaceId: string;
  items: NeedsAttentionEntry[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {items.map((item, i) => {
        const Icon = item.severity === "danger" ? XCircle : AlertTriangle;
        return (
          <Link
            key={i}
            href={`/workspaces/${workspaceId}/chat?panel=${item.panel}`}
            className="flex items-start gap-2 rounded-md p-1.5 text-sm hover:bg-accent"
          >
            <Icon
              className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                item.severity === "danger" ? "text-red-500" : "text-amber-500"
              }`}
            />
            <span>{item.message}</span>
          </Link>
        );
      })}
    </div>
  );
}
