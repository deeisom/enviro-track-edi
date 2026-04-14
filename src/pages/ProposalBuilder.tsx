import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { getProposal, createProposal, updateProposal, getNextProposalNumber, getAllClauses } from "@/services/proposalStorage";
import { getAllClients, getAllProjects, getContactsByClient } from "@/services/storage";
import { exportProposalDocx } from "@/services/proposalExport";
import type { Proposal, ProposalFeeItem, ProposalClauseSelection } from "@/types/proposal";
import type { Client, Project, Contact } from "@/types";
import { ProposalSetup } from "@/components/proposals/ProposalSetup";
import { ProposalDetails } from "@/components/proposals/ProposalDetails";
import { ProposalContentEditor } from "@/components/proposals/ProposalContentEditor";
import { ProposalPreview } from "@/components/proposals/ProposalPreview";
import { ArrowLeft, Save, FileDown } from "lucide-react";

export default function ProposalBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const [proposal, setProposal] = useState<Partial<Proposal>>({
    status: "draft",
    version: 1,
    proposalDate: new Date().toLocaleDateString("en-US"),
    expirationDate: "",
    serviceType: "",
    siteName: "",
    siteAddress: "",
    buildingArea: "",
    companyRepName: "",
    companyRepTitle: "",
    clientSignerName: "",
    clientSignerTitle: "",
    coverPage: {},
    proposalDetails: {},
    background: { text: "", ai_generated: false, locked: false, prompt_inputs: {} },
    scope: { text: "", ai_generated: false, locked: false, prompt_inputs: {} },
    feeItems: [],
    termsSelections: [],
    acceptance: {},
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clauses, setClauses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("setup");

  useEffect(() => {
    const load = async () => {
      try {
        const [c, p, cl] = await Promise.all([getAllClients(), getAllProjects(), getAllClauses()]);
        setClients(c);
        setProjects(p);
        setClauses(cl);

        if (!isNew && id) {
          const existing = await getProposal(id);
          if (existing) {
            setProposal(existing);
            if (existing.clientId) {
              const ct = await getContactsByClient(existing.clientId);
              setContacts(ct);
            }
          }
        } else {
          const defaultSelections: ProposalClauseSelection[] = cl
            .filter((c: any) => c.isDefault)
            .map((c: any) => ({ clauseId: c.id, included: true }));
          setProposal(prev => ({ ...prev, termsSelections: defaultSelections }));
        }
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleClientChange = useCallback(async (clientId: string) => {
    setProposal(prev => ({ ...prev, clientId }));
    if (clientId) {
      const ct = await getContactsByClient(clientId);
      setContacts(ct);
    } else {
      setContacts([]);
    }
  }, []);

  const update = useCallback((partial: Partial<Proposal>) => {
    setProposal(prev => ({ ...prev, ...partial }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const proposalNumber = await getNextProposalNumber();
        const created = await createProposal({ ...proposal, proposalNumber } as any);
        toast({ title: "Proposal created", description: created.proposalNumber });
        navigate(`/proposals/${created.id}`, { replace: true });
      } else {
        await updateProposal(id!, proposal);
        toast({ title: "Proposal saved" });
      }
    } catch (e: any) {
      toast({ title: "Error saving", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleExportDocx = async () => {
    setExporting(true);
    try {
      const clientObj = clients.find(c => c.id === proposal.clientId);
      const project = projects.find(p => p.id === proposal.projectId);
      await exportProposalDocx({
        proposal,
        clientName: clientObj?.companyName || "",
        clientAddress: clientObj?.address || "",
        project,
        clauses,
        contacts,
      });
      toast({ title: "DOCX exported successfully" });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const clientName = clients.find(c => c.id === proposal.clientId)?.companyName || "";
  const clientAddress = clients.find(c => c.id === proposal.clientId)?.address || "";
  const project = projects.find(p => p.id === proposal.projectId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/proposals")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {isNew ? "New Proposal" : `Proposal ${(proposal as Proposal).proposalNumber || ""}`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportDocx} disabled={exporting}>
            <FileDown className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Export DOCX"}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="mt-4">
          <ProposalSetup
            proposal={proposal}
            clients={clients}
            projects={projects}
            contacts={contacts}
            onUpdate={update}
            onClientChange={handleClientChange}
          />
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <ProposalDetails proposal={proposal} contacts={contacts} onUpdate={update} />
        </TabsContent>

        <TabsContent value="content" className="mt-4">
          <ProposalContentEditor
            proposal={proposal}
            clauses={clauses}
            onUpdate={update}
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <ProposalPreview
            proposal={proposal}
            clientName={clientName}
            clientAddress={clientAddress}
            project={project}
            clauses={clauses}
            contacts={contacts}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
