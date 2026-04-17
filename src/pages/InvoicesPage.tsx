import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getAllInvoices, createInvoice, updateInvoice, deleteInvoice, getAllRates } from "@/services/invoiceStorage";
import { getAllProjects, getAllClients, getClient, getProject, addInvoiceActivity } from "@/services/storage";
import { Invoice, InvoiceLineItem, InvoiceType, RateItem, RATE_CATEGORIES } from "@/types/invoice";
import { Project, Client } from "@/types";
import { exportInvoiceToExcel, exportInvoiceToPDF, exportCombinedInvoiceToExcel } from "@/services/invoiceExport";
import { toast } from "@/hooks/use-toast";
import { Plus, FileSpreadsheet, FileText, Trash2, ArrowLeft, Pencil, Leaf, AlertTriangle, Layers } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function InvoiceList({ onNew, onEdit }: { onNew: () => void; onEdit: (inv: Invoice) => void }) {
  const { canEdit, isAdmin } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const load = async () => {
    const [invs, projs] = await Promise.all([getAllInvoices(), getAllProjects()]);
    setInvoices(invs);
    setProjects(projs);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => { await deleteInvoice(id); toast({ title: "Deleted" }); load(); };
  const handleExcelExport = async (inv: Invoice) => {
    try { await exportInvoiceToExcel(inv); toast({ title: "Excel downloaded" }); }
    catch (e) { toast({ title: "Export failed", description: String(e), variant: "destructive" }); }
  };

  const handleStatusChange = async (inv: Invoice, newStatus: "draft" | "sent" | "paid") => {
    await updateInvoice(inv.id, { status: newStatus });

    // Also update all continuation pages linked to this invoice
    const continuations = invoices.filter(i => i.parentInvoiceId === inv.id);
    for (const cont of continuations) {
      await updateInvoice(cont.id, { status: newStatus });
    }

    // If this is a continuation, also update parent and siblings
    if (inv.parentInvoiceId) {
      await updateInvoice(inv.parentInvoiceId, { status: newStatus });
      const siblings = invoices.filter(i => i.parentInvoiceId === inv.parentInvoiceId && i.id !== inv.id);
      for (const sib of siblings) {
        await updateInvoice(sib.id, { status: newStatus });
      }
    }

    if (inv.type === "invoice" && (newStatus === "sent" || newStatus === "paid") && inv.projectId) {
      const project = projects.find(p => p.id === inv.projectId);
      if (project) {
        await addInvoiceActivity({
          projectId: project.id,
          projectNumber: project.projectNumber,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          note: `Invoice ${inv.invoiceNumber} marked as ${newStatus}`,
          newStatus: project.status,
        });
      }
    }

    toast({ title: `Status updated to ${newStatus}` });
    load();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-frontier font-bold italic tracking-wide flex items-center gap-2">Invoices & Estimates <Leaf className="h-5 w-5 text-primary" /></h1>
          <p className="text-muted-foreground text-sm">Create, manage, and export your documents</p>
        </div>
        {canEdit && <Button onClick={onNew}><Plus className="h-4 w-4 mr-1" /> Create New</Button>}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Project #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-40"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No invoices yet.</TableCell></TableRow>
              ) : invoices.map(inv => {
                const linkedProject = projects.find(p => p.id === inv.projectId);
                return (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono font-medium">{inv.invoiceNumber}</TableCell>
                  <TableCell className="capitalize">{inv.type}</TableCell>
                  <TableCell className="font-mono text-sm">{linkedProject?.projectNumber || "—"}</TableCell>
                  <TableCell>{inv.billTo.name}</TableCell>
                  <TableCell>{inv.date}</TableCell>
                  <TableCell className="text-right font-mono">${inv.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Select value={inv.status} onValueChange={v => handleStatusChange(inv, v as any)}>
                      <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => onEdit(inv)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Excel" onClick={() => handleExcelExport(inv)}><FileSpreadsheet className="h-3.5 w-3.5" /></Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {inv.invoiceNumber}?</AlertDialogTitle>
                            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(inv.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoiceEditor({ onBack, prefillProjectId, existingInvoice }: { onBack: () => void; prefillProjectId?: string; existingInvoice?: Invoice }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [rates, setRates] = useState<RateItem[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);

  const isEditing = !!existingInvoice;

  const [type, setType] = useState<InvoiceType>(existingInvoice?.type || "invoice");
  const [projectId, setProjectId] = useState<string>(existingInvoice?.projectId || prefillProjectId || "");
  const [billToName, setBillToName] = useState(existingInvoice?.billTo.name || "");
  const [billToAddress, setBillToAddress] = useState(existingInvoice?.billTo.address || "");
  const [poNumber, setPoNumber] = useState(existingInvoice?.poNumber || "");
  const [date, setDate] = useState(existingInvoice?.date || new Date().toISOString().split("T")[0]);
  const [terms, setTerms] = useState(existingInvoice?.terms || "Net 30");
  const [dueDate, setDueDate] = useState(existingInvoice?.dueDate || "");
  const [projectSummary, setProjectSummary] = useState(existingInvoice?.projectSummary || "");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(existingInvoice?.lineItems || []);
  const [status, setStatus] = useState<"draft" | "sent" | "paid">(existingInvoice?.status || "draft");

  const [isContinuation, setIsContinuation] = useState(!!existingInvoice?.parentInvoiceId);
  const [parentInvoiceId, setParentInvoiceId] = useState(existingInvoice?.parentInvoiceId || "");

  useEffect(() => {
    Promise.all([getAllProjects(), getAllClients(), getAllRates(), getAllInvoices()]).then(([p, c, r, inv]) => {
      setProjects(p);
      setClients(c);
      setRates(r);
      setAllInvoices(inv);
    });
  }, []);

  // Auto-fill from parent invoice when continuation is selected
  useEffect(() => {
    if (!isContinuation || !parentInvoiceId) return;
    const parent = allInvoices.find(i => i.id === parentInvoiceId);
    if (!parent) return;
    setBillToName(parent.billTo.name);
    setBillToAddress(parent.billTo.address);
    setPoNumber(parent.poNumber);
    setDate(parent.date);
    setTerms(parent.terms);
    setDueDate(parent.dueDate);
    setProjectSummary(parent.projectSummary);
    if (parent.projectId) setProjectId(parent.projectId);
  }, [parentInvoiceId, isContinuation]);

  useEffect(() => {
    if (isEditing) return;
    if (projectId && projects.length > 0) {
      const proj = projects.find(p => p.id === projectId);
      if (proj) {
        setProjectSummary(proj.description);
        setPoNumber(proj.projectNumber);
        if (proj.location) setBillToAddress(proj.location);
        if (proj.clientId) {
          const cl = clients.find(c => c.id === proj.clientId);
          if (cl) {
            setBillToName(cl.companyName);
            if (!proj.location) setBillToAddress(cl.address);
          }
        }
      }
    }
  }, [projectId, projects, clients]);

  useEffect(() => {
    if (date && terms === "Net 30" && !isEditing) {
      const d = new Date(date);
      d.setDate(d.getDate() + 30);
      setDueDate(d.toISOString().split("T")[0]);
    }
  }, [date, terms]);

  const addLineItem = (rateItem?: RateItem) => {
    const item: InvoiceLineItem = {
      id: crypto.randomUUID(),
      rateItemId: rateItem?.id,
      name: rateItem?.item || "",
      description: rateItem?.itemDescription || "",
      qty: 1,
      rate: rateItem?.defaultRate || 0,
      amount: rateItem?.defaultRate || 0,
    };
    setLineItems(prev => [...prev, item]);
  };

  const updateLineItem = (id: string, field: string, value: any) => {
    setLineItems(prev => prev.map(li => {
      if (li.id !== id) return li;
      const updated = { ...li, [field]: value };
      if (field === "qty" || field === "rate") {
        updated.amount = (updated.qty || 0) * (updated.rate || 0);
      }
      return updated;
    }));
  };

  const removeLineItem = (id: string) => setLineItems(prev => prev.filter(li => li.id !== id));

  const total = lineItems.reduce((s, li) => s + li.amount, 0);

  const handleSave = async () => {
    if (!billToName.trim()) { toast({ title: "Bill To name required", variant: "destructive" }); return; }
    if (lineItems.length === 0) { toast({ title: "Add at least one line item", variant: "destructive" }); return; }

    const invoiceData = {
      type,
      projectId: projectId || null,
      clientId: null as string | null,
      parentInvoiceId: (isContinuation && parentInvoiceId) ? parentInvoiceId : null,
      billTo: { name: billToName, address: billToAddress },
      poNumber, date, dueDate, terms, projectSummary,
      lineItems, total, status,
    };

    try {
      if (isEditing) {
        await updateInvoice(existingInvoice.id, invoiceData);
        toast({ title: `${type === "invoice" ? "Invoice" : "Estimate"} updated` });
      } else if (isContinuation && parentInvoiceId) {
        const parent = allInvoices.find(i => i.id === parentInvoiceId);
        if (!parent) { toast({ title: "Parent invoice not found", variant: "destructive" }); return; }
        const existingContinuations = allInvoices.filter(i => 
          i.invoiceNumber.startsWith(parent.invoiceNumber + "-")
        ).length;
        const suffix = String(existingContinuations + 1).padStart(2, "0");
        const continuationNumber = `${parent.invoiceNumber}-${suffix}`;
        await createInvoice(invoiceData, continuationNumber);
        toast({ title: `Continuation page ${continuationNumber} created` });
      } else {
        await createInvoice(invoiceData);
        toast({ title: `${type === "invoice" ? "Invoice" : "Estimate"} created` });
      }
      onBack();
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    }
  };

  const ratesByCategory = RATE_CATEGORIES.map(cat => ({
    ...cat,
    items: rates.filter(r => r.category === cat.value),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">{isEditing ? `Edit ${existingInvoice.invoiceNumber}` : `New ${type === "invoice" ? "Invoice" : "Estimate"}`}</h1>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={type} onValueChange={v => setType(v as InvoiceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="estimate">Estimate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Link to Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="None (standalone)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (standalone)</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.projectNumber} — {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(!isEditing || isContinuation) && (
            <div className="flex items-center gap-4 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="continuation"
                  checked={isContinuation}
                  disabled={isEditing}
                  onCheckedChange={(checked) => {
                    setIsContinuation(!!checked);
                    if (!checked) setParentInvoiceId("");
                  }}
                />
                <Label htmlFor="continuation" className="text-sm font-normal cursor-pointer">
                  This is a continuation page
                </Label>
              </div>
              {isContinuation && !isEditing && (
                <div className="flex-1 max-w-xs">
                  <Select value={parentInvoiceId} onValueChange={setParentInvoiceId}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select parent invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {allInvoices
                        .filter(i => i.type === type && !i.parentInvoiceId)
                        .map(i => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.invoiceNumber} — {i.billTo.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {isContinuation && isEditing && parentInvoiceId && (
                <span className="text-sm text-muted-foreground">
                  Linked to: {allInvoices.find(i => i.id === parentInvoiceId)?.invoiceNumber || "Unknown"}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Bill To</h3>
              <div className="space-y-2">
                <Label>Client Name *</Label>
                <Input value={billToName} onChange={e => setBillToName(e.target.value)} placeholder="Company name" />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea value={billToAddress} onChange={e => setBillToAddress(e.target.value)} rows={2} />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold">Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>PO #</Label><Input value={poNumber} onChange={e => setPoNumber(e.target.value)} /></div>
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Terms</Label><Input value={terms} onChange={e => setTerms(e.target.value)} /></div>
                <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Project Summary</Label>
            <Textarea value={projectSummary} onChange={e => setProjectSummary(e.target.value)} rows={2} placeholder="Description of work performed" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {lineItems.length >= 8 && (
            <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700 dark:text-yellow-400 text-sm">
                This invoice may exceed a single page. Consider creating a continuation page for additional items.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Line Items</h3>
            <div className="flex gap-2">
              {ratesByCategory.length > 0 && (
                <Select onValueChange={v => { const r = rates.find(ri => ri.id === v); if (r) addLineItem(r); }}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Add from rate table" /></SelectTrigger>
                  <SelectContent>
                    {ratesByCategory.map(g => (
                      g.items.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name} — ${r.defaultRate}/{r.unit}</SelectItem>
                      ))
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" size="sm" onClick={() => addLineItem()}>
                <Plus className="h-3 w-3 mr-1" /> Custom Item
              </Button>
            </div>
          </div>

          {(() => {
            // Collect line items from parent AND all sibling continuation pages
            const resolvedParentId = isContinuation ? parentInvoiceId : (existingInvoice?.parentInvoiceId || "");
            let relatedItemNames = new Set<string>();
            if (resolvedParentId) {
              const parent = allInvoices.find(i => i.id === resolvedParentId);
              if (parent) {
                parent.lineItems.forEach(li => {
                  if (li.name.trim()) relatedItemNames.add(li.name.toLowerCase().trim());
                });
              }
              // Also check all other continuation pages for the same parent
              const siblings = allInvoices.filter(i => i.parentInvoiceId === resolvedParentId && i.id !== existingInvoice?.id);
              siblings.forEach(sib => {
                sib.lineItems.forEach(li => {
                  if (li.name.trim()) relatedItemNames.add(li.name.toLowerCase().trim());
                });
              });
            }

            return lineItems.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">No line items yet. Add from your rate table or create a custom item.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-28">Qty</TableHead>
                    <TableHead className="w-24">Rate</TableHead>
                    <TableHead className="w-24 text-right">Amount</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map(li => {
                    const isDuplicate = resolvedParentId && relatedItemNames.has(li.name.toLowerCase().trim()) && li.name.trim() !== "";
                    return (
                      <TableRow key={li.id} className={isDuplicate ? "bg-yellow-50/50 dark:bg-yellow-950/10" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input value={li.name} onChange={e => updateLineItem(li.id, "name", e.target.value)} className="h-8 text-sm" />
                            {isDuplicate && (
                              <span title="This item also exists on previous pages of the invoice" className="text-yellow-600 shrink-0">
                                <AlertTriangle className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell><Input value={li.description} onChange={e => updateLineItem(li.id, "description", e.target.value)} className="h-8 text-sm" /></TableCell>
                        <TableCell><Input type="number" min="0" step="0.5" value={li.qty} onChange={e => updateLineItem(li.id, "qty", parseFloat(e.target.value) || 0)} className="h-8 text-sm" /></TableCell>
                        <TableCell><Input type="number" min="0" step="0.5" value={li.rate} onChange={e => updateLineItem(li.id, "rate", parseFloat(e.target.value) || 0)} className="h-8 text-sm" /></TableCell>
                        <TableCell className="text-right font-mono text-sm">${li.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeLineItem(li.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-semibold">Total</TableCell>
                  <TableCell className="text-right font-mono font-bold">${total.toFixed(2)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
            );
          })()}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onBack}>Cancel</Button>
        <Button onClick={handleSave}>{isEditing ? "Update" : "Save"} {type === "invoice" ? "Invoice" : "Estimate"}</Button>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<"list" | "create" | "edit">(searchParams.get("new") ? "create" : "list");
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>();
  const prefillProjectId = searchParams.get("projectId") || undefined;

  const handleEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setView("edit");
  };

  if (view === "list") return <InvoiceList onNew={() => setView("create")} onEdit={handleEdit} />;
  return <InvoiceEditor onBack={() => { setView("list"); setEditingInvoice(undefined); }} prefillProjectId={prefillProjectId} existingInvoice={view === "edit" ? editingInvoice : undefined} />;
}
