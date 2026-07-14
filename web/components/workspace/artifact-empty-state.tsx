import { X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ArtifactEmptyState({
  icon: Icon,
  message,
  onClose,
}: {
  icon: LucideIcon;
  message: string;
  onClose?: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-2 p-10 text-center text-sm text-muted-foreground">
      {onClose && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close panel"
          className="absolute top-2 right-2"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
      <Icon className="mb-1 h-7 w-7 text-muted-foreground/50" />
      <p>{message}</p>
    </div>
  );
}
