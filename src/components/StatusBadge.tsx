import { getStatusDef, ProjectStatus, PROJECT_STATUSES } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusColorMap: Record<string, string> = {
  Proposal: "bg-status-proposal text-white",
  Planning: "bg-status-planning text-white",
  Fieldwork: "bg-status-fieldwork text-white",
  Deliverables: "bg-status-deliverables text-white",
  Billing: "bg-status-billing text-white",
  Closed: "bg-status-closed text-white",
  Cancelled: "bg-status-cancelled text-white",
};

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  const def = getStatusDef(status);
  const colorClass = statusColorMap[def.phase] || "bg-muted text-muted-foreground";

  return (
    <Badge className={cn(colorClass, "font-medium", className)} variant="default">
      {def.code} - {def.label}
    </Badge>
  );
}

export function StatusTimeline({ currentStatus }: { currentStatus: ProjectStatus }) {
  const mainPhases = PROJECT_STATUSES.filter(s => s.code.endsWith(".0") && s.code !== "1.1");
  const currentNum = parseFloat(currentStatus);

  return (
    <div className="flex items-center gap-1 w-full">
      {mainPhases.map((phase, i) => {
        const phaseNum = parseFloat(phase.code);
        const isActive = currentNum >= phaseNum;
        const isCurrent = Math.floor(currentNum) === Math.floor(phaseNum);
        const colorClass = statusColorMap[phase.phase] || "bg-muted";

        return (
          <div key={phase.code} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={cn(
                "h-2 w-full rounded-full transition-all",
                isActive ? colorClass : "bg-muted"
              )}
            />
            <span
              className={cn(
                "text-[10px] leading-tight text-center",
                isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
              )}
            >
              {phase.phase}
            </span>
          </div>
        );
      })}
    </div>
  );
}
