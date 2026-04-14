import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Copy, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAllProposals, duplicateProposal, deleteProposal } from "@/services/proposalStorage";
import { getAllProjects, getAllClients } from "@/services/storage";
import type { Proposal, ProposalStatus } from "@/types/proposal";
import type { Client, Project } from "@/types";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const statusColors: Record<ProposalStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  draft_with_ai: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  internal_review: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  finalized: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  sent: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  superseded: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const statusLabels: Record<ProposalStatus, string> = {
  draft: "Draft",
  draft_with_ai: "Draft (AI)",
  internal_review: "Internal Review",
  finalized: "Finalized",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  superseded: "Superseded",
};

export default function ProposalsPage() {
  const navigate = useNavigate();
  const { canEdit, isAdmin } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [p, c, pr] = await Promise.all([getAllProposals(), getAllClients(), getAllProjects()]);
      setProposals(p);
      setClients(c);
      setProjects(pr);
    } catch (e: any) {
      toast({ title: "Error loading proposals", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const clientName = (id: string | null) => clients.find(c => c.id === id)?.companyName || "—";
  const projectName = (id: string | null) => {
    const p = projects.find(p => p.id === id);
    return p ? `${p.projectNumber} — ${p.name}` : "—";
  };

  const handleDuplicate = async (id: string) => {
    try {
      const dup = await duplicateProposal(id);
      toast({ title: "Proposal duplicated", description: `Created ${dup.proposalNumber}` });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this proposal?")) return;
    try {
      await deleteProposal(id);
      toast({ title: "Proposal deleted" });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proposals</h1>
        {canEdit && (
          <Button onClick={() => navigate("/proposals/new")}>
            <Plus className="h-4 w-4 mr-2" /> New Proposal
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No proposals yet. Create your first proposal to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proposal #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map(p => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/proposals/${p.id}`)}>
                    <TableCell className="font-medium">{p.proposalNumber}</TableCell>
                    <TableCell>{clientName(p.clientId)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{projectName(p.projectId)}</TableCell>
                    <TableCell>{p.serviceType || "—"}</TableCell>
                    <TableCell>{p.proposalDate || "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[p.status]} variant="secondary">
                        {statusLabels[p.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/proposals/${p.id}`)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <Button variant="ghost" size="icon" onClick={() => handleDuplicate(p.id)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
