import { flagEmoji } from "@/lib/flags";
import { cn } from "@/lib/utils";

export function Flag({
  code,
  name,
  className,
  showName = true,
  reverse = false,
}: {
  code?: string | null;
  name?: string | null;
  className?: string;
  showName?: boolean;
  reverse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2",
        reverse && "flex-row-reverse",
        className
      )}
    >
      <span className="text-xl leading-none">{flagEmoji(code || "")}</span>
      {showName && name && <span className="truncate">{name}</span>}
    </span>
  );
}
