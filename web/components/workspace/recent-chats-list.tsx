import Link from "next/link";
import type { RecentChatEntry } from "@/lib/placeholder-workspace-data";

export function RecentChatsList({
  workspaceId,
  chats,
}: {
  workspaceId: string;
  chats: RecentChatEntry[];
}) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {chats.map((chat) => (
        <Link
          key={chat.id}
          href={`/workspaces/${workspaceId}/chat?title=${encodeURIComponent(chat.title)}`}
          className="flex w-56 shrink-0 flex-col gap-1 rounded-lg border p-3 text-sm hover:bg-accent"
        >
          <span className="truncate">{chat.title}</span>
          <span className="font-mono text-xs text-muted-foreground">{chat.when}</span>
        </Link>
      ))}
    </div>
  );
}
