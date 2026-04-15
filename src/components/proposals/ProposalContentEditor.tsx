import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Proposal, ProposalFeeItem, ProposalClauseSelection, AIContentBlock } from "@/types/proposal";
import type { ProposalClause } from "@/types/proposal";
import { FeeScheduleEditor } from "./FeeScheduleEditor";
import { TermsClauseEngine } from "./TermsClauseEngine";
import { AIContentControls } from "./AIContentControls";

interface Props {
  proposal: Partial<Proposal>;
  clauses: ProposalClause[];
  onUpdate: (p: Partial<Proposal>) => void;
  onClauseCreated?: () => void;
  serviceType?: string;
}

export function ProposalContentEditor({ proposal, clauses, onUpdate, onClauseCreated }: Props) {
  const background = proposal.background as AIContentBlock || { text: "", ai_generated: false, locked: false, prompt_inputs: {} };
  const scope = proposal.scope as AIContentBlock || { text: "", ai_generated: false, locked: false, prompt_inputs: {} };
  const feeItems = (proposal.feeItems || []) as ProposalFeeItem[];
  const termsSelections = (proposal.termsSelections || []) as ProposalClauseSelection[];

  return (
    <div className="space-y-6">
      <AIContentControls
        section="background"
        title="Background"
        description="Explain why the client requested the work, what condition/concern led to the proposal."
        contentBlock={background}
        proposal={proposal}
        onUpdate={block => onUpdate({ background: block })}
      />

      <AIContentControls
        section="scope"
        title="Scope of Work"
        description="Describe what services will be performed, methods, deliverables."
        contentBlock={scope}
        proposal={proposal}
        onUpdate={block => onUpdate({ scope: block })}
      />

      <FeeScheduleEditor
        feeItems={feeItems}
        onUpdate={items => onUpdate({ feeItems: items })}
      />

      <TermsClauseEngine
        clauses={clauses}
        termsSelections={termsSelections}
        onUpdate={selections => onUpdate({ termsSelections: selections })}
        onClauseCreated={onClauseCreated}
      />
    </div>
  );
}
