export function StatLine({
  stat,
}: {
  stat: {
    coveragePct: number;
    requirementCount: number;
    needsReviewCount: number;
    orphanedCount: number;
  };
}) {
  return (
    <p className="flex flex-wrap items-baseline gap-2 text-sm text-muted-foreground">
      <span>
        <strong className="font-mono text-amber-600 dark:text-amber-400">
          {stat.coveragePct}%
        </strong>{" "}
        coverage
      </span>
      <span className="text-muted-foreground/50">·</span>
      <span>
        <strong className="font-mono">{stat.requirementCount}</strong> requirements
      </span>
      <span className="text-muted-foreground/50">·</span>
      <span>
        <strong className="font-mono text-amber-600 dark:text-amber-400">
          {stat.needsReviewCount}
        </strong>{" "}
        need review
      </span>
      <span className="text-muted-foreground/50">·</span>
      <span>
        <strong className="font-mono text-red-600 dark:text-red-400">{stat.orphanedCount}</strong>{" "}
        orphaned
      </span>
    </p>
  );
}
