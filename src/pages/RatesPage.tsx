import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAllRates, createRate, updateRate, deleteRate, seedRatesIfEmpty } from "@/services/invoiceStorage";
import { RateItem, RateCategory, RATE_CATEGORIES } from "@/types/invoice";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";

const UNITS = ["per hour", "per day", "per sample", "each", "flat"];

const emptyForm = { name: "", description: "", category: "services" as RateCategory, defaultRate: 0, unit: "per hour" };

export default function RatesPage() {
  const [rates, setRates] = useState<RateItem[]>([]);
  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterCat, setFilterCat] = useState<string>("all");

  const load = () => setRates(getAllRates());
  useEffect(() => { seedRatesIfEmpty(); load(); }, []);

  const filtered = filterCat === "all" ? rates : rates.filter(r => r.category === filterCat);

  const openNew = () => { setEditId(null); setForm(emptyForm); setDialog(true); };
  const openEdit = (r: RateItem) => {
    setEditId(r.id);
    setForm({ name: r.name, description: r.description, category: r.category, defaultRate: r.defaultRate, unit: r.unit });
    setDialog(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (editId) {
      updateRate(editId, form);
      toast({ title: "Rate item updated" });
    } else {
      createRate(form);
      toast({ title: "Rate item created" });
    }
    setDialog(false);
    load();
  };

  const handleDelete = (id: string) => { deleteRate(id); toast({ title: "Rate item deleted" }); load(); };

  const getCatLabel = (cat: RateCategory) => RATE_CATEGORIES.find(c => c.value === cat)?.label || cat;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rate Table</h1>
          <p className="text-muted-foreground text-sm">Manage reusable line items for estimates and invoices</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
      </div>

      <div className="flex gap-2">
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {RATE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No rate items yet. Click "Add Item" to get started.</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{getCatLabel(r.category)}</TableCell>
                  <TableCell className="font-mono">${r.defaultRate.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.unit}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Edit className="h-3 w-3" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{r.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>This won't affect existing invoices.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(r.id)}>Delete</AlertDialogAction>
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

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Rate Item" : "New Rate Item"}</DialogTitle>
            <DialogDescription>Define a reusable line item for your estimates and invoices.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Program Administration" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of the service" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as RateCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RATE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Default Rate ($)</Label>
              <Input type="number" step="0.01" min="0" value={form.defaultRate || ""} onChange={e => setForm(f => ({ ...f, defaultRate: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editId ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
