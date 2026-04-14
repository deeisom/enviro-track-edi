import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import { Check, ChevronsUpDown, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllInvoices } from "@/services/invoiceStorage";
import type { Invoice, InvoiceLineItem } from "@/types/invoice";
import type { ProposalFeeItem } from "@/types/proposal";

interface Props {
  projectId: string | null;
  estimateId: string | null;
  onEstimateSelect: (estimateId: string, feeItems: ProposalFeeItem[]) => void;
}

export function EstimateLinker({ projectId, estimateId, onEstimateSelect }: Props) {
  const [estimates, setEstimates] = useState<Invoice[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const all = await getAllInvoices();
        // Show all estimates — don't filter by project
        const ests = all.filter(i => i.type === "estimate");
        setEstimates(ests);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  const selectedEstimate = estimates.find(e => e.id === estimateId);

  const mapLineItemsToFeeItems = (lineItems: InvoiceLineItem[]): ProposalFeeItem[] => {
    return lineItems
      .filter(li => li.name.trim() || li.description.trim()) // skip blank rows
      .map((li, idx) => ({
        id: crypto.randomUUID(),
        sourceEstimateItem: li.name,
        sourceDescription: li.description,
        sourceQty: li.qty,
        sourceRate: li.rate,
        sourceAmount: li.amount,
        displayItem: li.name.trim(),
        displayDescription: li.description.trim(),
        displayQty: li.qty,
        displayRate: li.rate,
        displayAmount: li.qty * li.rate,
        sortOrder: idx,
        isOptional: false,
        manualOverride: false,
      }));
  };

  const handleSelect = (est: Invoice) => {
    const feeItems = mapLineItemsToFeeItems(est.lineItems);
    onEstimateSelect(est.id, feeItems);
    setOpen(false);
  };

  return (
    <div>
      <Label>Linked Estimate</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between mt-1">
            {selectedEstimate ? `${selectedEstimate.invoiceNumber} — $${selectedEstimate.total.toLocaleString()}` : "Select estimate..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search estimates..." />
            <CommandList>
              <CommandEmpty>{loading ? "Loading..." : "No estimates found."}</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {estimates.map(est => (
                  <CommandItem
                    key={est.id}
                    value={`${est.invoiceNumber} ${est.projectSummary}`}
                    onSelect={() => handleSelect(est)}
                  >
                    <Check className={cn("mr-2 h-4 w-4", estimateId === est.id ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col">
                      <span className="font-mono text-xs">{est.invoiceNumber}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[400px]">
                        {est.projectSummary || "No summary"} — ${est.total.toLocaleString()}
                      </span>
                    </div>
                  </CommandItem>
                ))}
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
