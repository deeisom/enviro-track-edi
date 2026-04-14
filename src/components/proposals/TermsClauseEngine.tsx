import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Pencil, RotateCcw } from "lucide-react";
import { useState } from "react";
import type { ProposalClauseSelection } from "@/types/proposal";
import type { ProposalClause } from "@/types/proposal";

interface Props {
  clauses: ProposalClause[];
  termsSelections: ProposalClauseSelection[];
  onUpdate: (selections: ProposalClauseSelection[]) => void;
}

const categoryLabels: Record<string, string> = {
  foundation: "Foundation",
  billing: "Billing & Fees",
  testing_limitations: "Testing Limitations",
  legal: "Legal",
  disposal: "Disposal & Waste",
  service_specific: "Service-Specific",
};

export function TermsClauseEngine({ clauses, termsSelections, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const isClauseIncluded = (clauseId: string) => {
    const sel = termsSelections.find(s => s.clauseId === clauseId);
    return sel ? sel.included : false;
  };

  const getEditedBody = (clauseId: string) => {
    return termsSelections.find(s => s.clauseId === clauseId)?.editedBody;
  };

  const toggleClause = (clauseId: string) => {
    const existing = termsSelections.find(s => s.clauseId === clauseId);
    if (existing) {
      onUpdate(termsSelections.map(s =>
        s.clauseId === clauseId ? { ...s, included: !s.included } : s
      ));
    } else {
      onUpdate([...termsSelections, { clauseId, included: true }]);
    }
  };

  const updateClauseBody = (clauseId: string, editedBody: string) => {
    const existing = termsSelections.find(s => s.clauseId === clauseId);
    if (existing) {
      onUpdate(termsSelections.map(s =>
        s.clauseId === clauseId ? { ...s, editedBody } : s
      ));
    } else {
      onUpdate([...termsSelections, { clauseId, included: true, editedBody }]);
    }
  };

  const resetClauseBody = (clauseId: string) => {
    onUpdate(termsSelections.map(s =>
      s.clauseId === clauseId ? { ...s, editedBody: undefined } : s
    ));
    setEditingId(null);
  };

  const clausesByCategory = clauses.reduce<Record<string, ProposalClause[]>>((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader><CardTitle>Terms & Conditions</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Toggle clauses to include/exclude. Click edit to customize text for this proposal.
        </p>
        <div className="space-y-6">
          {Object.entries(clausesByCategory).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold mb-2">{categoryLabels[category] || category}</h4>
              <div className="space-y-3">
                {items.map(clause => {
                  const included = isClauseIncluded(clause.id);
                  const edited = getEditedBody(clause.id);
                  const isEditing = editingId === clause.id;
                  const displayBody = edited || clause.body;

                  return (
                    <div key={clause.id} className={`p-3 rounded-md border ${included ? "border-primary/30 bg-primary/5" : ""}`}>
                      <div className="flex items-start gap-3">
                        <Switch
                          checked={included}
                          onCheckedChange={() => toggleClause(clause.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{clause.title}</p>
                            {included && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setEditingId(isEditing ? null : clause.id)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                {edited && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => resetClauseBody(clause.id)}
                                    title="Reset to default"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                          {isEditing && included ? (
                            <Textarea
                              className="mt-2 text-xs"
                              rows={4}
                              value={displayBody}
                              onChange={e => updateClauseBody(clause.id, e.target.value)}
                            />
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{displayBody}</p>
                          )}
                          {edited && !isEditing && (
                            <span className="text-xs text-amber-600 mt-1 inline-block">Customized for this proposal</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
