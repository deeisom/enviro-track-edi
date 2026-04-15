export type ProposalStatus =
  | "draft"
  | "draft_with_ai"
  | "internal_review"
  | "finalized"
  | "sent"
  | "accepted"
  | "rejected"
  | "superseded";

export const PROPOSAL_STATUSES: { value: ProposalStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "draft_with_ai", label: "Draft with AI Content" },
  { value: "internal_review", label: "Internal Review" },
  { value: "finalized", label: "Finalized for Export" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "superseded", label: "Superseded" },
];

export interface ProposalFeeItem {
  id: string;
  sourceEstimateItem?: string;
  sourceDescription?: string;
  sourceQty?: number;
  sourceRate?: number;
  sourceAmount?: number;
  displayItem: string;
  displayDescription: string;
  displayQty: number;
  displayRate: number;
  displayAmount: number;
  sortOrder: number;
  isOptional: boolean;
  manualOverride: boolean;
}

export interface AIContentBlock {
  text: string;
  ai_generated: boolean;
  locked: boolean;
  prompt_inputs: Record<string, string>;
}

export interface ProposalClauseSelection {
  clauseId: string;
  included: boolean;
  editedBody?: string;
  variables?: Record<string, string>;
  // For inline custom clauses
  isCustom?: boolean;
  customTitle?: string;
  customBody?: string;
  customCategory?: string;
}

export interface Proposal {
  id: string;
  proposalNumber: string;
  status: ProposalStatus;
  version: number;
  clientId: string | null;
  projectId: string | null;
  estimateId: string | null;
  proposalDate: string;
  expirationDate: string;
  serviceType: string;
  siteName: string;
  siteAddress: string;
  buildingArea: string;
  companyRepName: string;
  companyRepTitle: string;
  clientSignerName: string;
  clientSignerTitle: string;
  coverPage: Record<string, any>;
  proposalDetails: Record<string, any>;
  background: AIContentBlock;
  scope: AIContentBlock;
  feeItems: ProposalFeeItem[];
  termsSelections: ProposalClauseSelection[];
  acceptance: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalClause {
  id: string;
  title: string;
  body: string;
  category: string;
  isDefault: boolean;
  sortOrder: number;
  serviceTypes: string[];
  createdAt: string;
  updatedAt: string;
}
