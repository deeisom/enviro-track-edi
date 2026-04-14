import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, RefreshCw, Lock, Unlock, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import type { AIContentBlock, Proposal } from "@/types/proposal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  section: "background" | "scope";
  title: string;
  description: string;
  contentBlock: AIContentBlock;
  proposal: Partial<Proposal>;
  onUpdate: (block: AIContentBlock) => void;
}

const backgroundFields = [
  { key: "concern", label: "Issue / Concern", placeholder: "e.g. Suspected mold growth in HVAC system" },
  { key: "affectedAreas", label: "Affected Area(s)", placeholder: "e.g. Room 1A, Room 2, hallway" },
  { key: "reasonRequested", label: "Reason Work Requested", placeholder: "e.g. Occupant complaints of musty odor" },
  { key: "clientContext", label: "Client Context", placeholder: "e.g. School district preparing for renovation" },
  { key: "siteConditions", label: "Notable Site Conditions", placeholder: "e.g. Water damage noted on ceiling tiles" },
];

const scopeFields = [
  { key: "selectedServices", label: "Selected Services", placeholder: "e.g. Air sampling, surface sampling, visual inspection" },
  { key: "methods", label: "Methods / Sample Types", placeholder: "e.g. Spore trap air samples, tape lift surface samples" },
  { key: "deliverables", label: "Deliverables", placeholder: "e.g. Written report with findings and recommendations" },
  { key: "turnaround", label: "Turnaround Assumptions", placeholder: "e.g. Report within 5 business days" },
  { key: "exclusions", label: "Project-Specific Exclusions", placeholder: "e.g. Does not include remediation" },
  { key: "constraints", label: "Special Constraints", placeholder: "e.g. Work must be performed after school hours" },
];

export function AIContentControls({ section, title, description, contentBlock, proposal, onUpdate }: Props) {
  const [generating, setGenerating] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(!contentBlock.text);
  const [showRegenWarning, setShowRegenWarning] = useState(false);
  const [inputs, setInputs] = useState<Record<string, string>>(contentBlock.prompt_inputs || {});

  const fields = section === "background" ? backgroundFields : scopeFields;
  const hasExistingText = !!contentBlock.text.trim();
  const isLocked = contentBlock.locked;

  const doGenerate = async () => {
    setGenerating(true);
    try {
      const allInputs = {
        ...inputs,
        serviceType: proposal.serviceType || "",
        siteName: proposal.siteName || "",
        buildingArea: proposal.buildingArea || "",
      };

      const { data, error } = await supabase.functions.invoke("generate-proposal-content", {
        body: { section, inputs: allInputs },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      onUpdate({
        text: data.text,
        ai_generated: true,
        locked: false,
        prompt_inputs: inputs,
      });

      toast({ title: `${title} generated`, description: "Review and edit the generated content." });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (hasExistingText && contentBlock.ai_generated) {
      setShowRegenWarning(true);
    } else {
      doGenerate();
    }
  };

  const handleLockToggle = () => {
    onUpdate({ ...contentBlock, locked: !isLocked });
  };

  const updateInput = (key: string, value: string) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {title}
            {contentBlock.ai_generated && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-normal">
                AI Generated
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLockToggle}
              className="h-8"
              title={isLocked ? "Unlock for editing" : "Lock content"}
            >
              {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              <span className="ml-1 text-xs">{isLocked ? "Locked" : "Unlocked"}</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>

        {/* Structured prompt inputs */}
        <Collapsible open={promptsOpen} onOpenChange={setPromptsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Prompt Inputs
              </span>
              {promptsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            {fields.map(f => (
              <div key={f.key}>
                <Label className="text-xs">{f.label}</Label>
                <Input
                  className="mt-1"
                  value={inputs[f.key] || ""}
                  placeholder={f.placeholder}
                  onChange={e => updateInput(f.key, e.target.value)}
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleGenerate}
                disabled={generating || isLocked}
                size="sm"
              >
                {generating ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                {hasExistingText && contentBlock.ai_generated ? "Regenerate" : "Generate"}
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Content text area */}
        <Textarea
          rows={8}
          value={contentBlock.text}
          onChange={e => onUpdate({ ...contentBlock, text: e.target.value, ai_generated: contentBlock.ai_generated })}
          placeholder={section === "background" ? "Due to concerns about..." : "As part of the evaluation, EDI will..."}
          disabled={isLocked}
        />

        {/* Regeneration warning dialog */}
        <AlertDialog open={showRegenWarning} onOpenChange={setShowRegenWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Regenerate Content?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will overwrite the existing AI-generated text. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={doGenerate}>Regenerate</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
