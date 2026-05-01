import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Pencil, RotateCcw, Plus, X, Save, Sparkles, ChevronDown, ChevronRight, CheckCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ProposalClauseSelection } from "@/types/proposal";
import type { ProposalClause } from "@/types/proposal";
import { createClause } from "@/services/proposalStorage";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  clauses: ProposalClause[];
  termsSelections: ProposalClauseSelection[];
  serviceType?: string;
  onUpdate: (selections: ProposalClauseSelection[]) => void;
  onClauseCreated?: () => void;
}

const categoryLabels: Record<string, string> = {
  pricing_authorization: "Pricing & Authorization",
  billing: "Billing & Fees",
  testing_limitations: "Testing Limitations",
  scope_liability: "Scope & Liability",
  client_responsibilities: "Client Responsibilities",
  disposal: "Disposal & Waste",
  legal: "Legal",
  foundation: "Foundation",
  service_specific: "Service-Specific",
};

const categoryOptions = Object.entries(categoryLabels).map(([value, label]) => ({ value, label }));

// Known variable options for dropdowns
const VARIABLE_OPTIONS: Record<string, { label: string; options: string[] }> = {
  feeValidityPeriod: { label: "Fee Validity Period", options: ["30 days", "60 days", "90 days", "per contract"] },
  paymentTiming: { label: "Payment Timing", options: ["upon receipt of final invoice", "upon receipt of final report", "at time of on-site assessment", "per contract", "net 30 days"] },
  minHours: { label: "Minimum Hours", options: ["4", "6", "8"] },
  overtimeRate: { label: "Overtime Rate", options: ["1.5x", "2.0x"] },
  weekendRate: { label: "Weekend Rate", options: ["1.5x", "2.0x"] },
  holidayRate: { label: "Holiday Rate", options: ["2.0x", "2.5x"] },
  wasteClassification: { label: "Waste Classification", options: ["non-hazardous", "hazardous", "special waste", "universal waste"] },
};

/** Parse [variableName] placeholders from clause body */
function parseVariables(body: string): string[] {
  const matches = body.match(/\[([a-zA-Z_][a-zA-Z0-9_]*)\]/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1, -1)))];
}

/** Replace [variableName] with values, unfilled -> [___] */
function substituteVariables(body: string, variables: Record<string, string> = {}): string {
  return body.replace(/\[([a-zA-Z_][a-zA-Z0-9_]*)\]/g, (match, name) => {
    return variables[name] || "[___]";
  });
}

interface AIRecommendation {
  clauseId: string;
  reason: string;
  suggestedVariables?: Record<string, string>;
}

interface AINewClauseSuggestion {
  title: string;
  body: string;
  category: string;
  reason: string;
}

export function TermsClauseEngine({ clauses, termsSelections, serviceType, onUpdate, onClauseCreated }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState("pricing_authorization");
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [saving, setSaving] = useState(false);

  // AI Advisor state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[] | null>(null);
  const [aiNewSuggestions, setAiNewSuggestions] = useState<AINewClauseSuggestion[] | null>(null);

  const isClauseIncluded = (clauseId: string) => {
    const sel = termsSelections.find(s => s.clauseId === clauseId);
    return sel ? sel.included : false;
  };

  const getSelection = (clauseId: string) => termsSelections.find(s => s.clauseId === clauseId);

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

  const updateVariable = (clauseId: string, varName: string, value: string) => {
    const existing = termsSelections.find(s => s.clauseId === clauseId);
    const currentVars = existing?.variables || {};
    const newVars = { ...currentVars, [varName]: value };
    if (existing) {
      onUpdate(termsSelections.map(s =>
        s.clauseId === clauseId ? { ...s, variables: newVars } : s
      ));
    } else {
      onUpdate([...termsSelections, { clauseId, included: true, variables: newVars }]);
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
      setNewTitle(""); setNewBody(""); setNewCategory("pricing_authorization"); setSaveToLibrary(false); setShowAddForm(false);
    } catch (err) {
      toast.error("Failed to save clause");
    } finally {
      setSaving(false);
    }
  };

  // Service-type recommendations
  const recommendedClauseIds = serviceType
    ? clauses.filter(c => c.serviceTypes.includes(serviceType) && !isClauseIncluded(c.id)).map(c => c.id)
    : [];

  const addRecommendedClauses = () => {
    const newSelections = [...termsSelections];
    recommendedClauseIds.forEach(id => {
      if (!newSelections.find(s => s.clauseId === id)) {
        newSelections.push({ clauseId: id, included: true });
      } else {
        const idx = newSelections.findIndex(s => s.clauseId === id);
        if (idx >= 0) newSelections[idx] = { ...newSelections[idx], included: true };
      }
    });
    onUpdate(newSelections);
    toast.success(`Added ${recommendedClauseIds.length} recommended clauses`);
  };

  // AI Advisor
  const handleAiRecommend = async () => {
    if (!aiDescription.trim()) { toast.error("Please describe the job first"); return; }
    setAiLoading(true);
    setAiRecommendations(null);
    setAiNewSuggestions(null);
    try {
      const { data, error } = await supabase.functions.invoke("recommend-proposal-clauses", {
        body: {
          description: aiDescription,
          clauses: clauses.map(c => ({ id: c.id, title: c.title, body: c.body, category: c.category })),
        },
      });
      if (error) throw error;
      setAiRecommendations(data.recommendations || []);
      setAiNewSuggestions(data.newClauseSuggestions || []);
    } catch (err: any) {
      toast.error(err.message || "AI recommendation failed");
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiRecommendation = (rec: AIRecommendation) => {
    const existing = termsSelections.find(s => s.clauseId === rec.clauseId);
    if (existing) {
      onUpdate(termsSelections.map(s =>
        s.clauseId === rec.clauseId ? { ...s, included: true, variables: { ...(s.variables || {}), ...(rec.suggestedVariables || {}) } } : s
      ));
    } else {
      onUpdate([...termsSelections, { clauseId: rec.clauseId, included: true, variables: rec.suggestedVariables || {} }]);
    }
    toast.success("Clause applied");
  };

  const applyAllAiRecommendations = () => {
    if (!aiRecommendations) return;
    const newSelections = [...termsSelections];
    aiRecommendations.forEach(rec => {
      const idx = newSelections.findIndex(s => s.clauseId === rec.clauseId);
      if (idx >= 0) {
        newSelections[idx] = { ...newSelections[idx], included: true, variables: { ...(newSelections[idx].variables || {}), ...(rec.suggestedVariables || {}) } };
      } else {
        newSelections.push({ clauseId: rec.clauseId, included: true, variables: rec.suggestedVariables || {} });
      }
    });
    onUpdate(newSelections);
    toast.success(`Applied ${aiRecommendations.length} recommendations`);
  };

  const addAiSuggestedClause = (sug: AINewClauseSuggestion) => {
    const clauseId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    onUpdate([...termsSelections, {
      clauseId, included: true, isCustom: true,
      customTitle: sug.title, customBody: sug.body, customCategory: sug.category,
    }]);
    toast.success(`Added "${sug.title}"`);
  };

  const customSelections = termsSelections.filter(s => s.isCustom && s.customTitle);
  const clausesByCategory = clauses.reduce<Record<string, ProposalClause[]>>((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});
  const customByCategory = customSelections.reduce<Record<string, ProposalClauseSelection[]>>((acc, s) => {
    const cat = s.customCategory || "pricing_authorization";
    (acc[cat] = acc[cat] || []).push(s);
    return acc;
  }, {});
  const allCategories = [...new Set([...Object.keys(clausesByCategory), ...Object.keys(customByCategory)])];

  // Sort categories by the order defined in categoryLabels
  const categoryOrder = Object.keys(categoryLabels);
  allCategories.sort((a, b) => {
    const ia = categoryOrder.indexOf(a);
    const ib = categoryOrder.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  return (
    <Card>
      <CardHeader><CardTitle>Terms & Conditions</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Toggle clauses to include/exclude. Click edit to customize text for this proposal.
        </p>

        {/* Service-type recommendation banner */}
        {recommendedClauseIds.length > 0 && (
          <div className="mb-4 p-3 rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 flex items-center justify-between">
            <span className="text-sm">
              <strong>{recommendedClauseIds.length}</strong> recommended clauses for <strong>{serviceType}</strong> jobs
            </span>
            <Button size="sm" variant="outline" onClick={addRecommendedClauses}>
              <CheckCheck className="h-4 w-4 mr-1" /> Add Recommended
            </Button>
          </div>
        )}

        {/* AI Clause Advisor */}
        <Collapsible open={aiOpen} onOpenChange={setAiOpen} className="mb-6">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between mb-2">
              <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI Clause Advisor</span>
              {aiOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 border rounded-md bg-muted/30 space-y-3">
              <p className="text-xs text-muted-foreground">Describe the job in plain language and the AI will recommend which clauses to include and suggest variable values.</p>
              <Textarea
                placeholder="e.g. We're doing asbestos air monitoring during demolition of a school building. Work will be over 3 weekends with portal-to-portal billing..."
                value={aiDescription}
                onChange={e => setAiDescription(e.target.value)}
                rows={3}
              />
              <Button size="sm" onClick={handleAiRecommend} disabled={aiLoading}>
                {aiLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Analyzing...</> : <><Sparkles className="h-4 w-4 mr-1" /> Get Recommendations</>}
              </Button>

              {/* AI Results */}
              {aiRecommendations && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-semibold">Recommended Clauses ({aiRecommendations.length})</h5>
                    {aiRecommendations.length > 0 && (
                      <Button size="sm" variant="outline" onClick={applyAllAiRecommendations}>
                        <CheckCheck className="h-3 w-3 mr-1" /> Apply All
                      </Button>
                    )}
                  </div>
                  {aiRecommendations.map((rec, i) => {
                    const clause = clauses.find(c => c.id === rec.clauseId);
                    if (!clause) return null;
                    return (
                      <div key={i} className="p-2 border rounded text-sm flex items-start gap-2">
                        <div className="flex-1">
                          <p className="font-medium">{clause.title}</p>
                          <p className="text-xs text-muted-foreground">{rec.reason}</p>
                          {rec.suggestedVariables && Object.keys(rec.suggestedVariables).length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {Object.entries(rec.suggestedVariables).map(([k, v]) => (
                                <Badge key={k} variant="secondary" className="text-xs">{k}: {v}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => applyAiRecommendation(rec)}>Apply</Button>
                      </div>
                    );
                  })}

                  {aiNewSuggestions && aiNewSuggestions.length > 0 && (
                    <>
                      <h5 className="text-sm font-semibold mt-4">New Clause Suggestions</h5>
                      {aiNewSuggestions.map((sug, i) => (
                        <div key={i} className="p-2 border rounded text-sm border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{sug.title}</p>
                              <p className="text-xs text-muted-foreground">{sug.reason}</p>
                              <p className="text-xs mt-1 line-clamp-2">{sug.body}</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => addAiSuggestedClause(sug)}>Add</Button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Clause list by category */}
        <div className="space-y-6">
          {allCategories.map(category => {
            const libraryClauses = clausesByCategory[category] || [];
            const customClauses = customByCategory[category] || [];

            return (
              <div key={category}>
                <h4 className="text-sm font-semibold mb-2">{categoryLabels[category] || category}</h4>
                <div className="space-y-3">
                  {libraryClauses.map(clause => {
                    const included = isClauseIncluded(clause.id);
                    const sel = getSelection(clause.id);
                    const edited = sel?.editedBody;
                    const isEditing = editingId === clause.id;
                    const displayBody = edited || clause.body;
                    const variables = parseVariables(clause.body);
                    const isRecommended = serviceType && clause.serviceTypes.includes(serviceType);

                    return (
                      <div key={clause.id} className={`p-3 rounded-md border ${included ? "border-primary/30 bg-primary/5" : ""}`}>
                        <div className="flex items-start gap-3">
                          <Switch checked={included} onCheckedChange={() => toggleClause(clause.id)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium">{clause.title}</p>
                              {isRecommended && !included && (
                                <Badge variant="outline" className="text-xs border-blue-400 text-blue-600">Recommended</Badge>
                              )}
                              {clause.isDefault && (
                                <Badge variant="secondary" className="text-xs">Default</Badge>
                              )}
                              {included && (
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(isEditing ? null : clause.id)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  {edited && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => resetClauseBody(clause.id)} title="Reset to default">
                                      <RotateCcw className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>

                            {isEditing && included ? (
                              <Textarea className="mt-2 text-xs" rows={4} value={displayBody} onChange={e => updateClauseBody(clause.id, e.target.value)} />
                            ) : (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {substituteVariables(displayBody, sel?.variables)}
                              </p>
                            )}

                            {edited && !isEditing && (
                              <span className="text-xs text-amber-600 mt-1 inline-block">Customized for this proposal</span>
                            )}

                            {/* Variable fill-in inputs */}
                            {included && variables.length > 0 && !isEditing && (
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                {variables.map(varName => {
                                  const knownOptions = VARIABLE_OPTIONS[varName];
                                  const currentValue = sel?.variables?.[varName] || "";
                                  return (
                                    <div key={varName} className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">{knownOptions?.label || varName}</Label>
                                      {knownOptions ? (
                                        <Select value={currentValue} onValueChange={v => updateVariable(clause.id, varName, v)}>
                                          <SelectTrigger className="h-7 text-xs">
                                            <SelectValue placeholder={`Select ${knownOptions.label}`} />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {knownOptions.options.map(opt => (
                                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        <Input className="h-7 text-xs" value={currentValue} onChange={e => updateVariable(clause.id, varName, e.target.value)} placeholder={`Enter ${varName}`} />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {customClauses.map(sel => (
                    <div key={sel.clauseId} className="p-3 rounded-md border border-amber-500/30 bg-amber-500/5">
                      <div className="flex items-start gap-3">
                        <Switch checked={sel.included} onCheckedChange={() => toggleClause(sel.clauseId)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{sel.customTitle}</p>
                            <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">Custom</Badge>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeCustomClause(sel.clauseId)} title="Remove custom clause">
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
                <Checkbox id="save-to-library" checked={saveToLibrary} onCheckedChange={(checked) => setSaveToLibrary(checked === true)} />
                <Label htmlFor="save-to-library" className="text-xs cursor-pointer">Save to clause library for future proposals</Label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddCustomClause} disabled={saving}>
                  <Save className="h-3 w-3 mr-1" /> {saving ? "Saving..." : "Add Clause"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setNewTitle(""); setNewBody(""); setSaveToLibrary(false); }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
