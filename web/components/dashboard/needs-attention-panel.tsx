"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, XCircle } from "lucide-react";
import type { NeedsAttentionItem } from "@/lib/api";

export function NeedsAttentionPanel({ items }: { items: NeedsAttentionItem[] }) {
  const router = useRouter();

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4">
      <p className="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">
        Needs attention across workspaces
      </p>
      {items.length === 0 ? (
        <p className="px-1 py-2 text-sm text-gray-400">Nothing needs attention yet.</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {items.map((item, i) => {
            const Icon = item.severity === "danger" ? XCircle : AlertTriangle;
            return (
              <button
                key={`${item.workspace_id}-${i}`}
                onClick={() => router.push(`/workspaces/${item.workspace_id}`)}
                className="flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-gray-50"
              >
                <Icon
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                    item.severity === "danger" ? "text-red-500" : "text-amber-500"
                  }`}
                />
                <span className="text-gray-500">
                  <strong className="font-semibold text-black">{item.workspace_name}</strong>
                  {" — "}
                  {item.message}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
