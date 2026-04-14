import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { Proposal, ProposalFeeItem, ProposalClauseSelection, AIContentBlock } from "@/types/proposal";
import type { ProposalClause } from "@/types/proposal";
import { FeeScheduleEditor } from "./FeeScheduleEditor";
import { TermsClauseEngine } from "./TermsClauseEngine";

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
            onChange={e => onUpdate({ background: { ...background, text: e.target.value } })}
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
            onChange={e => onUpdate({ scope: { ...scope, text: e.target.value } })}
            placeholder="As part of the evaluation, EDI will..."
            disabled={scope.locked}
          />
          <p className="text-xs text-muted-foreground mt-1">AI generation for this section will be available in Phase 3.</p>
        </CardContent>
      </Card>

      {/* Fee Schedule */}
      <FeeScheduleEditor
        feeItems={feeItems}
        onUpdate={items => onUpdate({ feeItems: items })}
      />

      {/* Terms & Conditions */}
      <TermsClauseEngine
        clauses={clauses}
        termsSelections={termsSelections}
        onUpdate={selections => onUpdate({ termsSelections: selections })}
      />
    </div>
  );
}
