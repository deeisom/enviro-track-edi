import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/StatusBadge";
import { getAllProjects, getAllActivity, getProject } from "@/services/storage";
import { Project, ActivityLogEntry, PROJECT_STATUSES, getStatusDef } from "@/types";
import { Plus, Search, FolderKanban, AlertCircle, Leaf } from "lucide-react";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    setProjects(getAllProjects());
    setActivity(getAllActivity().slice(0, 10));
  }, []);

  const statusCounts = PROJECT_STATUSES.filter(s => s.code.endsWith(".0") || s.code === "1.1").map(s => ({
    ...s,
    count: projects.filter(p => p.status.startsWith(s.code.split(".")[0]) || p.status === s.code).length,
  }));

  // Simplified: group by main phase
  const phaseCounts = [
    { phase: "Proposal", codes: ["1.0", "1.1"], color: "bg-status-proposal" },
    { phase: "Planning", codes: ["2.0"], color: "bg-status-planning" },
    { phase: "Fieldwork", codes: ["3.0", "3.1", "3.2"], color: "bg-status-fieldwork" },
    { phase: "Deliverables", codes: ["4.0", "4.1"], color: "bg-status-deliverables" },
    { phase: "Billing", codes: ["5.0"], color: "bg-status-billing" },
    { phase: "Closed", codes: ["6.0"], color: "bg-status-closed" },
    { phase: "Cancelled", codes: ["7.0"], color: "bg-status-cancelled" },
  ].map(g => ({
    ...g,
    count: projects.filter(p => g.codes.includes(p.status)).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-frontier italic tracking-wide flex items-center gap-2">Dashboard <Leaf className="h-5 w-5 text-primary" /></h1>
          <p className="text-muted-foreground">
            {projects.length} total project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/projects/new">
              <Plus className="h-4 w-4 mr-1" /> New Project
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/projects">
              <Search className="h-4 w-4 mr-1" /> All Projects
            </Link>
          </Button>
        </div>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {phaseCounts.map(pc => (
          <Card key={pc.phase} className="relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${pc.color}`} />
            <CardHeader className="pb-2 pl-5">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {pc.phase}
              </CardTitle>
            </CardHeader>
            <CardContent className="pl-5">
              <div className="text-2xl font-bold">{pc.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderKanban className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No activity yet. Create your first project to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map(a => (
                <div key={a.id} className="flex items-start gap-3 text-sm">
                  <div className="text-muted-foreground text-xs w-32 shrink-0 pt-0.5">
                    {new Date(a.timestamp).toLocaleDateString()}{" "}
                    {new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="flex-1">
                    <Link to={`/projects/${a.projectId}`} className="font-medium text-primary hover:underline">
                      {a.projectNumber}
                    </Link>
                    {" → "}
                    {a.isInvoiceEvent ? (
                      <span className="text-muted-foreground">{a.note}</span>
                    ) : (
                      <StatusBadge status={a.newStatus} className="text-[10px] py-0 px-1.5" />
                    )}
                    {a.isInvoiceEvent && (() => {
                      const proj = getProject(a.projectId);
                      const projStatus = proj ? parseFloat(proj.status) : 999;
                      return projStatus < 3.1 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="inline h-4 w-4 text-destructive ml-1 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Project status should be updated to 3.1 or higher to reflect invoice delivery.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : null;
                    })()}
                    {!a.isInvoiceEvent && a.note && <span className="text-muted-foreground ml-2">— {a.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
