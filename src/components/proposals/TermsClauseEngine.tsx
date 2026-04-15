import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, RotateCcw, Plus, X, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ProposalClauseSelection } from "@/types/proposal";
import type { ProposalClause } from "@/types/proposal";
import { createClause } from "@/services/proposalStorage";

interface Props {
  clauses: ProposalClause[];
  termsSelections: ProposalClauseSelection[];
  onUpdate: (selections: ProposalClauseSelection[]) => void;
  onClauseCreated?: () => void;
}

const categoryLabels: Record<string, string> = {
  foundation: "Foundation",
  billing: "Billing & Fees",
  testing_limitations: "Testing Limitations",
  legal: "Legal",
  disposal: "Disposal & Waste",
  service_specific: "Service-Specific",
  pricing_authorization: "Pricing & Authorization",
  scope_liability: "Scope & Liability",
  client_responsibilities: "Client Responsibilities",
};

const categoryOptions = Object.entries(categoryLabels).map(([value, label]) => ({ value, label }));

export function TermsClauseEngine({ clauses, termsSelections, onUpdate, onClauseCreated }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState("foundation");
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const removeCustomClause = (clauseId: string) => {
    onUpdate(termsSelections.filter(s => s.clauseId !== clauseId));
  };

  const handleAddCustomClause = async () => {
    if (!newTitle.trim() || !newBody.trim()) {
      toast.error("Title and body are required");
      return;
    }

    setSaving(true);
    try {
      let clauseId: string;

      if (saveToLibrary) {
        const created = await createClause({ title: newTitle.trim(), body: newBody.trim(), category: newCategory });
        clauseId = created.id;
        toast.success("Clause saved to library for future proposals");
        onClauseCreated?.();
      } else {
        clauseId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      }

      const newSelection: ProposalClauseSelection = {
        clauseId,
        included: true,
        isCustom: !saveToLibrary,
        customTitle: !saveToLibrary ? newTitle.trim() : undefined,
        customBody: !saveToLibrary ? newBody.trim() : undefined,
        customCategory: !saveToLibrary ? newCategory : undefined,
      };

      onUpdate([...termsSelections, newSelection]);
      setNewTitle("");
      setNewBody("");
      setNewCategory("foundation");
      setSaveToLibrary(false);
      setShowAddForm(false);
    } catch (err) {
      toast.error("Failed to save clause");
    } finally {
      setSaving(false);
    }
  };

  // Get custom inline clauses from selections
  const customSelections = termsSelections.filter(s => s.isCustom && s.customTitle);

  const clausesByCategory = clauses.reduce<Record<string, ProposalClause[]>>((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  // Group custom clauses by category too
  const customByCategory = customSelections.reduce<Record<string, ProposalClauseSelection[]>>((acc, s) => {
    const cat = s.customCategory || "foundation";
    (acc[cat] = acc[cat] || []).push(s);
    return acc;
  }, {});

  // Merge all category keys
  const allCategories = new Set([...Object.keys(clausesByCategory), ...Object.keys(customByCategory)]);

  return (
    <Card>
      <CardHeader><CardTitle>Terms & Conditions</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Toggle clauses to include/exclude. Click edit to customize text for this proposal.
        </p>
        <div className="space-y-6">
          {Array.from(allCategories).map(category => {
            const libraryClauses = clausesByCategory[category] || [];
            const customClauses = customByCategory[category] || [];

            return (
              <div key={category}>
                <h4 className="text-sm font-semibold mb-2">{categoryLabels[category] || category}</h4>
                <div className="space-y-3">
                  {/* Library clauses */}
                  {libraryClauses.map(clause => {
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

                  {/* Custom inline clauses in this category */}
                  {customClauses.map(sel => (
                    <div key={sel.clauseId} className="p-3 rounded-md border border-amber-500/30 bg-amber-500/5">
                      <div className="flex items-start gap-3">
                        <Switch checked={sel.included} onCheckedChange={() => toggleClause(sel.clauseId)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{sel.customTitle}</p>
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Custom</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => removeCustomClause(sel.clauseId)}
                              title="Remove custom clause"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sel.customBody}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Custom Clause */}
        <div className="mt-6 border-t pt-4">
          {!showAddForm ? (
            <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Custom Clause
            </Button>
          ) : (
            <div className="space-y-3 p-4 border rounded-md bg-muted/30">
              <h4 className="text-sm font-semibold">New Custom Clause</h4>
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Clause title" />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Body</Label>
                <Textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Clause text..." rows={4} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="save-to-library"
                  checked={saveToLibrary}
                  onCheckedChange={(checked) => setSaveToLibrary(checked === true)}
                />
                <Label htmlFor="save-to-library" className="text-xs cursor-pointer">
                  Save to clause library for future proposals
                </Label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddCustomClause} disabled={saving}>
                  <Save className="h-3 w-3 mr-1" /> {saving ? "Saving..." : "Add Clause"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setNewTitle(""); setNewBody(""); setSaveToLibrary(false); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
