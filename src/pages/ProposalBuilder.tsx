import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { getProposal, createProposal, updateProposal, getNextProposalNumber, getAllClauses } from "@/services/proposalStorage";
import { getAllClients, getAllProjects, getContactsByClient } from "@/services/storage";
import { getAllInvoices, getInvoice } from "@/services/invoiceStorage";
import { exportProposalDocx } from "@/services/proposalExport";
import type { Proposal } from "@/types/proposal";
import type { Client, Project, Contact } from "@/types";
import type { Invoice } from "@/types/invoice";
import type { DownloadedFile } from "@/services/download";
import { invoiceLineItemsToProposalFeeItems } from "@/services/proposalFeeItems";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProposalSetup } from "@/components/proposals/ProposalSetup";
import { ProposalInfoSection, SignersSection } from "@/components/proposals/ProposalDetails";
import { ProposalPreview } from "@/components/proposals/ProposalPreview";
import { CoverPageStep, getEffectiveCoverFields } from "@/components/proposals/CoverPageStep";
import { AIContentControls } from "@/components/proposals/AIContentControls";
import { FeeScheduleEditor } from "@/components/proposals/FeeScheduleEditor";
import { TermsClauseEngine } from "@/components/proposals/TermsClauseEngine";
import type { AIContentBlock, ProposalFeeItem, ProposalClauseSelection } from "@/types/proposal";
import { ArrowLeft, Save, FileDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function ProposalBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const isNew = !id || id === "new";

  const [proposal, setProposal] = useState<Partial<Proposal>>({
    status: "draft",
    version: 1,
    proposalDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    expirationDate: "",
    serviceType: "",
    secondaryServiceType: "",
    siteName: "",
    siteAddress: "",
    siteAddressLine2: "",
    buildingArea: "",
    companyRepName: "Tim Groman",
    companyRepTitle: "Director, Industrial Hygiene & Safety",
    clientSignerName: "",
    clientSignerTitle: "Client Authorized Representative",
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
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [lastDownload, setLastDownload] = useState<DownloadedFile | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [c, p, cl, inv] = await Promise.all([getAllClients(), getAllProjects(), getAllClauses(), getAllInvoices()]);
        setClients(c);
        setProjects(p);
        setClauses(cl);
        setAllInvoices(inv);

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
  }, [id, isNew]);

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

  const getLinkedInvoice = useCallback(async (estimateId: string) => {
    const listedInvoice = allInvoices.find(inv => inv.id === estimateId);
    if (listedInvoice) return listedInvoice;

    const fetchedInvoice = await getInvoice(estimateId);
    if (fetchedInvoice) {
      setAllInvoices(prev => prev.some(inv => inv.id === fetchedInvoice.id) ? prev : [fetchedInvoice, ...prev]);
    }
    return fetchedInvoice;
  }, [allInvoices]);

  const handleEstimateSelect = useCallback(async (estimateId: string) => {
    try {
      const invoice = await getLinkedInvoice(estimateId);
      if (!invoice) {
        setProposal(prev => ({ ...prev, estimateId, feeItems: [] }));
        toast({ title: "Invoice not found", description: "The selected invoice could not be loaded.", variant: "destructive" });
        return;
      }

      const feeItems = invoiceLineItemsToProposalFeeItems(invoice.lineItems || []);
      setProposal(prev => ({ ...prev, estimateId: invoice.id, feeItems }));

      if (feeItems.length === 0) {
        toast({ title: "No fee items found", description: `${invoice.invoiceNumber} does not have line items yet.` });
      } else {
        toast({ title: "Fee schedule loaded", description: `${feeItems.length} items from ${invoice.invoiceNumber}` });
      }
    } catch (e: any) {
      toast({ title: "Could not load fee schedule", description: e.message, variant: "destructive" });
    }
  }, [getLinkedInvoice]);

  useEffect(() => {
    let cancelled = false;

    const hydrateLinkedFeeItems = async () => {
      if (!proposal.estimateId || (proposal.feeItems || []).length > 0) return;
      const invoice = await getLinkedInvoice(proposal.estimateId);
      if (cancelled || !invoice || !invoice.lineItems.length) return;

      const feeItems = invoiceLineItemsToProposalFeeItems(invoice.lineItems);
      if (feeItems.length === 0) return;

      setProposal(prev => {
        if (prev.estimateId !== invoice.id || (prev.feeItems || []).length > 0) return prev;
        return { ...prev, feeItems };
      });
    };

    hydrateLinkedFeeItems().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [getLinkedInvoice, proposal.estimateId, proposal.feeItems]);

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
      const autoClientName = clientObj?.companyName || "";
      const autoClientAddress = clientObj?.address || "";
      const autoProjectNumber = project?.projectNumber || "";
      const eff = getEffectiveCoverFields(proposal, autoClientName, autoClientAddress, autoProjectNumber);
      const download = await exportProposalDocx({
        proposal,
        clientName: eff.clientName,
        clientAddress: eff.clientAddress,
        project: eff.projectNumber !== autoProjectNumber && project
          ? { ...project, projectNumber: eff.projectNumber }
          : project,
        clauses,
        contacts,
      });
      setLastDownload(download);
      toast({ title: "DOCX ready", description: "Use the Download ready link if the browser does not save it automatically." });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const autoClientName = clients.find(c => c.id === proposal.clientId)?.companyName || "";
  const autoClientAddress = clients.find(c => c.id === proposal.clientId)?.address || "";
  const project = projects.find(p => p.id === proposal.projectId);
  const autoProjectNumber = project?.projectNumber || "";
  const effective = getEffectiveCoverFields(proposal, autoClientName, autoClientAddress, autoProjectNumber);
  const clientName = effective.clientName;
  const clientAddress = effective.clientAddress;
  const projectNumber = effective.projectNumber;
  const effectiveProject = projectNumber !== autoProjectNumber && project
    ? { ...project, projectNumber }
    : project;

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
          {canEdit && (
            <>
              <Button variant="outline" onClick={handleExportDocx} disabled={exporting}>
                <FileDown className="h-4 w-4 mr-2" />
                {exporting ? "Exporting..." : "Export DOCX"}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>
      {lastDownload && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>Download ready: {lastDownload.filename}. If it did not save automatically, use this link.</span>
            <a className="font-medium text-primary underline" href={lastDownload.url} download={lastDownload.filename} target="_blank" rel="noreferrer">
              Download again
            </a>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="cover">Cover Page</TabsTrigger>
          <TabsTrigger value="proposal">Proposal</TabsTrigger>
          <TabsTrigger value="fees">Fee Schedule</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
          <TabsTrigger value="preview">Full Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="mt-4 space-y-6">
          <ProposalSetup
            proposal={proposal}
            clients={clients}
            projects={projects}
            contacts={contacts}
            invoices={allInvoices}
            onUpdate={update}
            onClientChange={handleClientChange}
            onEstimateSelect={handleEstimateSelect}
          />
          <SignersSection proposal={proposal} onUpdate={update} />
        </TabsContent>

        <TabsContent value="cover" className="mt-4">
          <CoverPageStep
            proposal={proposal}
            clientName={autoClientName}
            clientAddress={autoClientAddress}
            projectNumber={autoProjectNumber}
            onUpdate={update}
          />
        </TabsContent>

        <TabsContent value="proposal" className="mt-4 space-y-6">
          <ProposalInfoSection proposal={proposal} onUpdate={update} />
          <AIContentControls
            section="background"
            title="Background"
            description="Explain why the client requested the work, what condition/concern led to the proposal."
            contentBlock={(proposal.background as AIContentBlock) || { text: "", ai_generated: false, locked: false, prompt_inputs: {} }}
            proposal={proposal}
            onUpdate={block => update({ background: block })}
          />
          <AIContentControls
            section="scope"
            title="Scope of Work"
            description="Describe what services will be performed, methods, deliverables."
            contentBlock={(proposal.scope as AIContentBlock) || { text: "", ai_generated: false, locked: false, prompt_inputs: {} }}
            proposal={proposal}
            onUpdate={block => update({ scope: block })}
          />
        </TabsContent>

        <TabsContent value="fees" className="mt-4">
          <FeeScheduleEditor
            feeItems={(proposal.feeItems || []) as ProposalFeeItem[]}
            onUpdate={items => update({ feeItems: items })}
          />
        </TabsContent>

        <TabsContent value="terms" className="mt-4">
          <TermsClauseEngine
            clauses={clauses}
            termsSelections={(proposal.termsSelections || []) as ProposalClauseSelection[]}
            serviceType={proposal.serviceType}
            onUpdate={selections => update({ termsSelections: selections })}
            onClauseCreated={async () => {
              const refreshed = await getAllClauses();
              setClauses(refreshed);
            }}
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <ProposalPreview
            proposal={proposal}
            clientName={clientName}
            clientAddress={clientAddress}
            project={effectiveProject}
            clauses={clauses}
            contacts={contacts}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
