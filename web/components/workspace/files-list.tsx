import type { FileEntry } from "@/lib/placeholder-workspace-data";

export function FilesList({ files }: { files: FileEntry[] }) {
  return (
    <div>
      {files.map((file, i) => (
        <div
          key={file.id}
          className={`flex items-center justify-between gap-2 py-2 text-sm ${i < files.length - 1 ? "border-b" : ""}`}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            <span className="rounded border px-1.5 py-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
              {file.origin}
            </span>
            <span className="truncate">{file.name}</span>
          </span>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {file.uploadedAt}
          </span>
        </div>
      ))}
    </div>
  );
}
