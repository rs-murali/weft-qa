import { BarChart3, CheckSquare, FlaskConical } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export function PipelineRail({
  counts,
}: {
  counts: { requirements: number; testCases: number };
}) {
  const items = [
    { value: "requirements", label: "Requirements", icon: CheckSquare, count: counts.requirements },
    { value: "testcases", label: "Test Cases", icon: FlaskConical, count: counts.testCases },
    { value: "coverage", label: "Coverage", icon: BarChart3, count: 0 },
  ] as const;

  return (
    <TabsList className="!h-full w-48 shrink-0 flex-col items-stretch justify-start gap-1 rounded-none border-r bg-transparent p-2 pr-3">
      {items.map(({ value, label, icon: Icon, count }) => (
        <TabsTrigger
          key={value}
          value={value}
          className="h-auto flex-none justify-start gap-3 rounded-md px-3 py-2.5 data-[state=active]:bg-accent data-[state=active]:shadow-none"
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">{label}</span>
          {count > 0 && (
            <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
              {count}
            </Badge>
          )}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
