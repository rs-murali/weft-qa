import { cn } from "@/lib/utils";

export type WeaveStatus = "covered" | "needs_review" | "orphaned" | "missing";

const STATUS_LABEL: Record<WeaveStatus, string> = {
  covered: "covered",
  needs_review: "needs_review",
  orphaned: "orphaned",
  missing: "missing / unmapped",
};

/** Tailwind classes for a single thread bar, keyed by coverage status. */
export function weaveStatusClassName(status: WeaveStatus): string {
  switch (status) {
    case "covered":
      return "bg-emerald-500 dark:bg-emerald-400";
    case "needs_review":
      return "bg-amber-200 dark:bg-amber-900/50";
    case "orphaned":
      return "bg-red-500/55 dark:bg-red-400/55";
    case "missing":
      return "bg-transparent border border-dashed border-gray-300 dark:border-gray-600";
  }
}

const STRIPE_STYLE = {
  backgroundImage:
    "repeating-linear-gradient(-45deg, var(--color-amber-500) 0px, var(--color-amber-500) 2px, transparent 2px, transparent 4px)",
} as const;

export function WeaveThreadBar({
  status,
  title,
  className,
}: {
  status: WeaveStatus;
  title?: string;
  className?: string;
}) {
  return (
    <i
      title={title ?? STATUS_LABEL[status]}
      aria-label={title ?? STATUS_LABEL[status]}
      style={status === "needs_review" ? STRIPE_STYLE : undefined}
      className={cn(
        "inline-block h-[5px] w-3 rounded-[1px]",
        weaveStatusClassName(status),
        className,
      )}
    />
  );
}

export function WeaveThreads({
  threads,
  size = "md",
}: {
  threads: WeaveStatus[];
  size?: "sm" | "md";
}) {
  if (threads.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-[3px] align-middle">
      {threads.map((status, i) => (
        <WeaveThreadBar key={i} status={status} className={size === "sm" ? "w-2.5" : undefined} />
      ))}
    </span>
  );
}

const LEGEND_ITEMS: WeaveStatus[] = ["covered", "needs_review", "orphaned", "missing"];

export function WeaveLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-3 text-xs text-muted-foreground", className)}>
      {LEGEND_ITEMS.map((status) => (
        <span key={status} className="inline-flex items-center gap-1.5">
          <WeaveThreadBar status={status} />
          {STATUS_LABEL[status]}
        </span>
      ))}
    </div>
  );
}
