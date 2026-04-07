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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getAllInvoices, createInvoice, deleteInvoice, getAllRates } from "@/services/invoiceStorage";
import { getAllProjects, getAllClients, getClient } from "@/services/storage";
import { Invoice, InvoiceLineItem, InvoiceType, RateItem, RATE_CATEGORIES } from "@/types/invoice";
import { exportInvoiceToExcel, exportInvoiceToPDF } from "@/services/invoiceExport";
import { toast } from "@/hooks/use-toast";
import { Plus, FileSpreadsheet, FileText, Trash2, ArrowLeft } from "lucide-react";

function InvoiceList({ onNew }: { onNew: () => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const load = () => setInvoices(getAllInvoices().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  useEffect(load, []);

  const handleDelete = (id: string) => { deleteInvoice(id); toast({ title: "Deleted" }); load(); };
  const handleExcelExport = async (inv: Invoice) => {
    try { await exportInvoiceToExcel(inv); toast({ title: "Excel downloaded" }); }
    catch (e) { toast({ title: "Export failed", description: String(e), variant: "destructive" }); }
  };

  const statusColors: Record<string, string> = { draft: "secondary", sent: "default", paid: "outline" };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices & Estimates</h1>
          <p className="text-muted-foreground text-sm">Create, manage, and export your documents</p>
        </div>
        <Button onClick={onNew}><Plus className="h-4 w-4 mr-1" /> Create New</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No invoices yet.</TableCell></TableRow>
              ) : invoices.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono font-medium">{inv.invoiceNumber}</TableCell>
                  <TableCell className="capitalize">{inv.type}</TableCell>
                  <TableCell>{inv.billTo.name}</TableCell>
                  <TableCell>{inv.date}</TableCell>
                  <TableCell className="text-right font-mono">${inv.total.toFixed(2)}</TableCell>
                  <TableCell><Badge variant={statusColors[inv.status] as any}>{inv.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Excel" onClick={() => handleExcelExport(inv)}>
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="PDF" onClick={() => { exportInvoiceToPDF(inv); }}>
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoiceCreator({ onBack, prefillProjectId }: { onBack: () => void; prefillProjectId?: string }) {
  const projects = getAllProjects();
  const clients = getAllClients();
  const rates = getAllRates();

  const [type, setType] = useState<InvoiceType>("invoice");
  const [projectId, setProjectId] = useState<string>(prefillProjectId || "");
  const [billToName, setBillToName] = useState("");
  const [billToAddress, setBillToAddress] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [terms, setTerms] = useState("Net 30");
  const [dueDate, setDueDate] = useState("");
  const [projectSummary, setProjectSummary] = useState("");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [status, setStatus] = useState<"draft" | "sent" | "paid">("draft");

  // Auto-fill from project
  useEffect(() => {
    if (projectId) {
      const proj = projects.find(p => p.id === projectId);
      if (proj) {
        setProjectSummary(proj.description);
        if (proj.clientId) {
          const cl = getClient(proj.clientId);
          if (cl) {
            setBillToName(cl.companyName);
            setBillToAddress(cl.address);
          }
        }
      }
    }
  }, [projectId]);

  // Auto-calculate due date
  useEffect(() => {
    if (date && terms === "Net 30") {
      const d = new Date(date);
      d.setDate(d.getDate() + 30);
      setDueDate(d.toISOString().split("T")[0]);
    }
  }, [date, terms]);

  const addLineItem = (rateItem?: RateItem) => {
    const item: InvoiceLineItem = {
      id: crypto.randomUUID(),
      rateItemId: rateItem?.id,
      name: rateItem?.name || "",
      description: rateItem?.description || "",
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

  const handleSave = () => {
    if (!billToName.trim()) { toast({ title: "Bill To name required", variant: "destructive" }); return; }
    if (lineItems.length === 0) { toast({ title: "Add at least one line item", variant: "destructive" }); return; }
    createInvoice({
      type,
      projectId: projectId || null,
      clientId: null,
      billTo: { name: billToName, address: billToAddress },
      poNumber, date, dueDate, terms, projectSummary,
      lineItems, total, status,
    });
    toast({ title: `${type === "invoice" ? "Invoice" : "Estimate"} created` });
    onBack();
  };

  // Group rates by category for the "add from rate table" dropdown
  const ratesByCategory = RATE_CATEGORIES.map(cat => ({
    ...cat,
    items: rates.filter(r => r.category === cat.value),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">New {type === "invoice" ? "Invoice" : "Estimate"}</h1>
      </div>

      {/* Type + Project + Status */}
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
        </CardContent>
      </Card>

      {/* Bill To + Metadata */}
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
                <div className="space-y-2">
                  <Label>PO #</Label>
                  <Input value={poNumber} onChange={e => setPoNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Terms</Label>
                  <Input value={terms} onChange={e => setTerms(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Project Summary</Label>
            <Textarea value={projectSummary} onChange={e => setProjectSummary(e.target.value)} rows={2} placeholder="Description of work performed" />
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardContent className="pt-6 space-y-4">
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

          {lineItems.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No line items yet. Add from your rate table or create a custom item.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-20">Qty</TableHead>
                  <TableHead className="w-24">Rate</TableHead>
                  <TableHead className="w-24 text-right">Amount</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map(li => (
                  <TableRow key={li.id}>
                    <TableCell>
                      <Input value={li.name} onChange={e => updateLineItem(li.id, "name", e.target.value)} className="h-8 text-sm" />
                    </TableCell>
                    <TableCell>
                      <Input value={li.description} onChange={e => updateLineItem(li.id, "description", e.target.value)} className="h-8 text-sm" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min="0" value={li.qty} onChange={e => updateLineItem(li.id, "qty", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min="0" step="0.01" value={li.rate} onChange={e => updateLineItem(li.id, "rate", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">${li.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeLineItem(li.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-semibold">Total</TableCell>
                  <TableCell className="text-right font-mono font-bold">${total.toFixed(2)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onBack}>Cancel</Button>
        <Button onClick={handleSave}>Save {type === "invoice" ? "Invoice" : "Estimate"}</Button>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<"list" | "create">(searchParams.get("new") ? "create" : "list");
  const prefillProjectId = searchParams.get("projectId") || undefined;

  return view === "list"
    ? <InvoiceList onNew={() => setView("create")} />
    : <InvoiceCreator onBack={() => setView("list")} prefillProjectId={prefillProjectId} />;
}
