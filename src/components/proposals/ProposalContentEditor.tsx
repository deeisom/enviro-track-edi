import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { Proposal, ProposalFeeItem, ProposalClauseSelection, AIContentBlock } from "@/types/proposal";
import type { ProposalClause } from "@/types/proposal";

interface Props {
  proposal: Partial<Proposal>;
  clauses: ProposalClause[];
  onUpdate: (p: Partial<Proposal>) => void;
}

export function ProposalContentEditor({ proposal, clauses, onUpdate }: Props) {
  const background = proposal.background as AIContentBlock || { text: "", ai_generated: false, locked: false, prompt_inputs: {} };
  const scope = proposal.scope as AIContentBlock || { text: "", ai_generated: false, locked: false, prompt_inputs: {} };
  const feeItems = (proposal.feeItems || []) as ProposalFeeItem[];
  const termsSelections = (proposal.termsSelections || []) as ProposalClauseSelection[];

  const updateBackground = (text: string) => {
    onUpdate({ background: { ...background, text } });
  };

  const updateScope = (text: string) => {
    onUpdate({ scope: { ...scope, text } });
  };

  // Fee items
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
    onUpdate({ feeItems: [...feeItems, newItem] });
  };

  const updateFeeItem = (idx: number, partial: Partial<ProposalFeeItem>) => {
    const updated = feeItems.map((item, i) => {
      if (i !== idx) return item;
      const merged = { ...item, ...partial };
      // Recalculate amount
      if (partial.displayQty !== undefined || partial.displayRate !== undefined) {
        merged.displayAmount = merged.displayQty * merged.displayRate;
      }
      return merged;
    });
    onUpdate({ feeItems: updated });
  };

  const removeFeeItem = (idx: number) => {
    onUpdate({ feeItems: feeItems.filter((_, i) => i !== idx) });
  };

  const feeTotal = feeItems.reduce((sum, item) => sum + (item.displayAmount || 0), 0);

  // Terms
  const isClauseIncluded = (clauseId: string) => {
    const sel = termsSelections.find(s => s.clauseId === clauseId);
    return sel ? sel.included : false;
  };

  const toggleClause = (clauseId: string) => {
    const existing = termsSelections.find(s => s.clauseId === clauseId);
    if (existing) {
      onUpdate({
        termsSelections: termsSelections.map(s =>
          s.clauseId === clauseId ? { ...s, included: !s.included } : s
        ),
      });
    } else {
      onUpdate({
        termsSelections: [...termsSelections, { clauseId, included: true }],
      });
    }
  };

  const clausesByCategory = clauses.reduce<Record<string, ProposalClause[]>>((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    foundation: "Foundation",
    billing: "Billing & Fees",
    testing_limitations: "Testing Limitations",
    legal: "Legal",
    disposal: "Disposal & Waste",
    service_specific: "Service-Specific",
  };

  return (
    <div className="space-y-6">
      {/* Background */}
      <Card>
        <CardHeader><CardTitle>Background</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Explain why the client requested the work, what condition/concern led to the proposal.
          </p>
          <Textarea
            rows={6}
            value={background.text}
            onChange={e => updateBackground(e.target.value)}
            placeholder="Due to concerns about..."
            disabled={background.locked}
          />
          <p className="text-xs text-muted-foreground mt-1">AI generation for this section will be available in Phase 3.</p>
        </CardContent>
      </Card>

      {/* Scope */}
      <Card>
        <CardHeader><CardTitle>Scope of Work</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Describe what services will be performed, methods, deliverables.
          </p>
          <Textarea
            rows={8}
            value={scope.text}
            onChange={e => updateScope(e.target.value)}
            placeholder="As part of the evaluation, EDI will..."
            disabled={scope.locked}
          />
          <p className="text-xs text-muted-foreground mt-1">AI generation for this section will be available in Phase 3.</p>
        </CardContent>
      </Card>

      {/* Fee Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Fee Schedule</CardTitle>
            <Button variant="outline" size="sm" onClick={addFeeItem}>
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {feeItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No fee items yet. Add items manually or link an estimate.</p>
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

      {/* Terms & Conditions */}
      <Card>
        <CardHeader><CardTitle>Terms & Conditions</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Toggle clauses to include/exclude from the proposal. Default clauses are pre-selected.
          </p>
          <div className="space-y-6">
            {Object.entries(clausesByCategory).map(([category, items]) => (
              <div key={category}>
                <h4 className="text-sm font-semibold mb-2">{categoryLabels[category] || category}</h4>
                <div className="space-y-3">
                  {items.map(clause => (
                    <div key={clause.id} className="flex items-start gap-3 p-3 rounded-md border">
                      <Switch
                        checked={isClauseIncluded(clause.id)}
                        onCheckedChange={() => toggleClause(clause.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{clause.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{clause.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
