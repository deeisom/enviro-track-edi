import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProposalFeeItem } from "@/types/proposal";

export interface LinkedFeeDocumentOption {
  id: string;
  label: string;
  type: "estimate" | "invoice";
  total: number;
  lineCount: number;
}

interface Props {
  feeItems: ProposalFeeItem[];
  onUpdate: (items: ProposalFeeItem[]) => void;
  linkedDocumentOptions?: LinkedFeeDocumentOption[];
  selectedLinkedDocumentId?: string | null;
  onLinkedDocumentChange?: (id: string) => void;
  linkedDocumentLabel?: string;
  linkedDocumentTotal?: number;
  linkedDocumentLineCount?: number;
  onImportLinkedDocument?: () => void;
}

export function FeeScheduleEditor({
  feeItems,
  onUpdate,
  linkedDocumentOptions = [],
  selectedLinkedDocumentId,
  onLinkedDocumentChange,
  linkedDocumentLabel,
  linkedDocumentTotal,
  linkedDocumentLineCount,
  onImportLinkedDocument,
}: Props) {
  const addFeeItem = () => {
    const newItem: ProposalFeeItem = {
      id: crypto.randomUUID(),
      displayItem: "",
      displayDescription: "",
      displayQty: 1,
      displayRate: 0,
      displayAmount: 0,
      sortOrder: feeItems.length,
      isOptional: false,
      manualOverride: true,
    };
    onUpdate([...feeItems, newItem]);
  };

  const updateFeeItem = (idx: number, partial: Partial<ProposalFeeItem>) => {
    const updated = feeItems.map((item, i) => {
      if (i !== idx) return item;
      const merged = { ...item, ...partial, manualOverride: true };
      if (partial.displayQty !== undefined || partial.displayRate !== undefined) {
        merged.displayAmount = merged.displayQty * merged.displayRate;
      }
      return merged;
    });
    onUpdate(updated);
  };

  const removeFeeItem = (idx: number) => {
    onUpdate(feeItems.filter((_, i) => i !== idx));
  };

  const feeTotal = feeItems.reduce((sum, item) => sum + (item.displayAmount || 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Fee Schedule</CardTitle>
            {linkedDocumentLabel ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{linkedDocumentLabel}</Badge>
                <span>{linkedDocumentLineCount || 0} line items</span>
                <span>${(linkedDocumentTotal || 0).toLocaleString()}</span>
              </div>
            ) : linkedDocumentOptions.length > 0 ? (
              <p className="text-sm text-muted-foreground">Choose an estimate or invoice to bring its line items into this proposal.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Add proposal fee items manually or link an estimate/invoice from Setup.</p>
            )}
          </div>
          <div className="flex gap-2">
            {onImportLinkedDocument && linkedDocumentOptions.length === 0 && (
              <Button variant="outline" size="sm" onClick={onImportLinkedDocument}>
                Import Linked Items
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={addFeeItem}>
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {linkedDocumentOptions.length > 0 && onLinkedDocumentChange && (
          <div className="mb-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Linked estimate or invoice</label>
              <Select value={selectedLinkedDocumentId || ""} onValueChange={onLinkedDocumentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select estimate or invoice..." />
                </SelectTrigger>
                <SelectContent>
                  {linkedDocumentOptions.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.label} - {doc.lineCount} items - ${doc.total.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {onImportLinkedDocument && (
              <Button variant="secondary" onClick={onImportLinkedDocument}>
                Import Linked Items
              </Button>
            )}
          </div>
        )}
        {feeItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {linkedDocumentLabel
              ? "No fee items yet. Import the linked items above or add items manually."
              : "No fee items yet. Add items manually or link an estimate."}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_2fr_80px_100px_100px_40px] gap-2 text-xs font-medium text-muted-foreground">
              <span>Item</span><span>Description</span><span>Qty</span><span>Rate</span><span>Amount</span><span />
            </div>
            {feeItems.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-[1fr_2fr_80px_100px_100px_40px] gap-2 items-start">
                <Input
                  value={item.displayItem}
                  onChange={e => updateFeeItem(idx, { displayItem: e.target.value })}
                  placeholder="Item"
                />
                <Textarea
                  value={item.displayDescription}
                  onChange={e => updateFeeItem(idx, { displayDescription: e.target.value })}
                  placeholder="Description"
                  rows={1}
                  className="min-h-[40px] resize-y"
                />
                <Input
                  type="number"
                  value={item.displayQty}
                  onChange={e => updateFeeItem(idx, { displayQty: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  value={item.displayRate}
                  onChange={e => updateFeeItem(idx, { displayRate: Number(e.target.value) })}
                />
                <div className="flex items-center h-10 px-2 text-sm font-medium">
                  ${item.displayAmount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeFeeItem(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex justify-end pt-2 border-t">
              <span className="font-semibold text-lg">
                Total: ${feeTotal.toLocaleString("en-US", { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
