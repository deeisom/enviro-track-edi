import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import type { ProposalFeeItem } from "@/types/proposal";

interface Props {
  feeItems: ProposalFeeItem[];
  onUpdate: (items: ProposalFeeItem[]) => void;
}

export function FeeScheduleEditor({
  feeItems,
  onUpdate,
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
          <CardTitle>Fee Schedule</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addFeeItem}>
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {feeItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No fee items yet. Connect an estimate or invoice in Setup, or add items manually.
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
