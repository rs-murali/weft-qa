import Link from "next/link";
import type { ChatThread } from "@/lib/api";

export function RecentChatsList({
  workspaceId,
  chats,
}: {
  workspaceId: string;
  chats: ChatThread[];
}) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {chats.map((chat) => (
        <Link
          key={chat.thread_id}
          href={`/workspaces/${workspaceId}/chat?thread=${chat.thread_id}&title=${encodeURIComponent(chat.title)}`}
          className="flex w-56 shrink-0 flex-col gap-1 rounded-lg border p-3 text-sm hover:bg-accent"
        >
          <span className="truncate font-medium">{chat.title}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {new Date(chat.updated_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </Link>
      ))}
    </div>
  );
}
