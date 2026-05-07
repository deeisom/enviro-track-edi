import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import { Check, ChevronsUpDown, Download, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllInvoices } from "@/services/invoiceStorage";
import type { Invoice, InvoiceLineItem } from "@/types/invoice";
import type { ProposalFeeItem } from "@/types/proposal";

interface Props {
  projectId: string | null;
  estimateId: string | null;
  feeItems: ProposalFeeItem[];
  onEstimateSelect: (estimateId: string, feeItems: ProposalFeeItem[]) => void;
}

export function EstimateLinker({ projectId, estimateId, feeItems, onEstimateSelect }: Props) {
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const all = await getAllInvoices();
      // Include both estimates AND invoices; user can attach either.
        setAllInvoices(all);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Sort: project-associated first (with star), then the rest. Within each group: estimates before invoices, newest first.
  const sortedInvoices = useMemo(() => {
    const associated: Invoice[] = [];
    const others: Invoice[] = [];
    for (const inv of allInvoices) {
      if (projectId && inv.projectId === projectId) associated.push(inv);
      else others.push(inv);
    }
    const byTypeThenDate = (a: Invoice, b: Invoice) => {
      if (a.type !== b.type) return a.type === "estimate" ? -1 : 1;
      return (b.date || "").localeCompare(a.date || "");
    };
    associated.sort(byTypeThenDate);
    others.sort(byTypeThenDate);
    return { associated, others };
  }, [allInvoices, projectId]);

  const selectedEstimate = allInvoices.find(e => e.id === estimateId);

  const mapLineItemsToFeeItems = (lineItems: InvoiceLineItem[]): ProposalFeeItem[] => {
    return lineItems
      .filter(li => li.name.trim() || li.description.trim()) // skip blank rows
      .map((li, idx) => ({
        id: crypto.randomUUID(),
        sourceEstimateItem: li.name,
        sourceDescription: li.description,
        sourceQty: Number(li.qty) || 0,
        sourceRate: Number(li.rate) || 0,
        sourceAmount: Number(li.amount) || 0,
        displayItem: li.name.trim(),
        displayDescription: li.description.trim(),
        displayQty: Number(li.qty) || 0,
        displayRate: Number(li.rate) || 0,
        displayAmount: Number(li.amount) || (Number(li.qty) || 0) * (Number(li.rate) || 0),
        sortOrder: idx,
        isOptional: false,
        manualOverride: false,
      }));
  };

  useEffect(() => {
    if (!estimateId || feeItems.length > 0 || !selectedEstimate?.lineItems.length) return;
    onEstimateSelect(estimateId, mapLineItemsToFeeItems(selectedEstimate.lineItems));
  }, [estimateId, feeItems.length, selectedEstimate, onEstimateSelect]);

  const handleSelect = (est: Invoice) => {
    const feeItems = mapLineItemsToFeeItems(est.lineItems);
    onEstimateSelect(est.id, feeItems);
    setOpen(false);
  };

  const renderItem = (inv: Invoice, isAssociated: boolean) => (
    <CommandItem
      key={inv.id}
      value={`${inv.invoiceNumber} ${inv.projectSummary} ${inv.type}`}
      onSelect={() => handleSelect(inv)}
    >
      <Check className={cn("mr-2 h-4 w-4 shrink-0", estimateId === inv.id ? "opacity-100" : "opacity-0")} />
      <div className="flex flex-col flex-1 min-w-0">
        <span className="font-mono text-xs flex items-center gap-1">
          {isAssociated && <Star className="h-3 w-3 fill-primary text-primary" />}
          {inv.invoiceNumber}
          <span className="ml-1 text-[10px] uppercase text-muted-foreground">({inv.type})</span>
        </span>
        <span className="text-xs text-muted-foreground truncate">
                              {inv.projectSummary || "No summary"} - ${inv.total.toLocaleString()}
        </span>
      </div>
    </CommandItem>
  );

  return (
    <div>
      <Label>Linked Estimate or Invoice</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between mt-1">
          {selectedEstimate ? `${selectedEstimate.invoiceNumber} - $${selectedEstimate.total.toLocaleString()}` : "Select estimate or invoice..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search estimates and invoices..." />
            <CommandList>
              <CommandEmpty>{loading ? "Loading..." : "Nothing found."}</CommandEmpty>
              {sortedInvoices.associated.length > 0 && (
                <CommandGroup heading="★ Associated with this project" className="max-h-[200px] overflow-y-auto">
                  {sortedInvoices.associated.map(inv => renderItem(inv, true))}
                </CommandGroup>
              )}
              <CommandGroup heading="All other estimates & invoices" className="max-h-[300px] overflow-y-auto">
                {sortedInvoices.others.map(inv => renderItem(inv, false))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedEstimate && (
        <p className="text-sm text-muted-foreground mt-1">
          <Download className="inline h-3 w-3 mr-1" />
          {selectedEstimate.lineItems.length} line items · ${selectedEstimate.total.toLocaleString()}
        </p>
      )}
    </div>
  );
}
