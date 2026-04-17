import { supabase } from "@/integrations/supabase/client";
import { fetchAllPaged } from "./storage";
import type { Proposal, ProposalClause, ProposalStatus, ProposalFeeItem, ProposalClauseSelection, AIContentBlock } from "@/types/proposal";

// --- Proposals ---

export async function getNextProposalNumber(): Promise<string> {
  const { data, error } = await supabase.rpc("get_next_proposal_number");
  if (error) throw error;
  return data as string;
}

export async function getAllProposals(): Promise<Proposal[]> {
  const rows = await fetchAllPaged<any>(() =>
    supabase.from("proposals").select("*").order("created_at", { ascending: false })
  );
  return rows.map(mapProposal);
}

export async function getProposal(id: string): Promise<Proposal | undefined> {
  const { data, error } = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapProposal(data) : undefined;
}

export async function createProposal(input: Partial<Proposal> & { proposalNumber: string }): Promise<Proposal> {
  const { data, error } = await supabase.from("proposals").insert({
    proposal_number: input.proposalNumber,
    status: input.status || "draft",
    version: input.version || 1,
    client_id: input.clientId || null,
    project_id: input.projectId || null,
    estimate_id: input.estimateId || null,
    proposal_date: input.proposalDate || "",
    expiration_date: input.expirationDate || "",
    service_type: input.serviceType || "",
    site_name: input.siteName || "",
    site_address: input.siteAddress || "",
    building_area: input.buildingArea || "",
    company_rep_name: input.companyRepName || "",
    company_rep_title: input.companyRepTitle || "",
    client_signer_name: input.clientSignerName || "",
    client_signer_title: input.clientSignerTitle || "",
    cover_page: { ...(input.coverPage || {}), secondaryServiceType: input.secondaryServiceType || "", siteAddressLine2: input.siteAddressLine2 || "" },
    proposal_details: input.proposalDetails || {},
    background: input.background || { text: "", ai_generated: false, locked: false, prompt_inputs: {} },
    scope: input.scope || { text: "", ai_generated: false, locked: false, prompt_inputs: {} },
    fee_items: input.feeItems || [],
    terms_selections: input.termsSelections || [],
    acceptance: input.acceptance || {},
  } as any).select().single();
  if (error) throw error;
  return mapProposal(data);
}

export async function updateProposal(id: string, input: Partial<Proposal>): Promise<Proposal> {
  const updateData: any = {};
  if (input.status !== undefined) updateData.status = input.status;
  if (input.version !== undefined) updateData.version = input.version;
  if (input.clientId !== undefined) updateData.client_id = input.clientId;
  if (input.projectId !== undefined) updateData.project_id = input.projectId;
  if (input.estimateId !== undefined) updateData.estimate_id = input.estimateId;
  if (input.proposalDate !== undefined) updateData.proposal_date = input.proposalDate;
  if (input.expirationDate !== undefined) updateData.expiration_date = input.expirationDate;
  if (input.serviceType !== undefined) updateData.service_type = input.serviceType;
  if (input.siteName !== undefined) updateData.site_name = input.siteName;
  if (input.siteAddress !== undefined) updateData.site_address = input.siteAddress;
  if (input.buildingArea !== undefined) updateData.building_area = input.buildingArea;
  if (input.companyRepName !== undefined) updateData.company_rep_name = input.companyRepName;
  if (input.companyRepTitle !== undefined) updateData.company_rep_title = input.companyRepTitle;
  if (input.clientSignerName !== undefined) updateData.client_signer_name = input.clientSignerName;
  if (input.clientSignerTitle !== undefined) updateData.client_signer_title = input.clientSignerTitle;
  if (input.coverPage !== undefined || input.secondaryServiceType !== undefined || input.siteAddressLine2 !== undefined) {
    updateData.cover_page = { ...(input.coverPage || {}), secondaryServiceType: input.secondaryServiceType || "", siteAddressLine2: input.siteAddressLine2 || "" };
  }
  if (input.proposalDetails !== undefined) updateData.proposal_details = input.proposalDetails;
  if (input.background !== undefined) updateData.background = input.background;
  if (input.scope !== undefined) updateData.scope = input.scope;
  if (input.feeItems !== undefined) updateData.fee_items = input.feeItems;
  if (input.termsSelections !== undefined) updateData.terms_selections = input.termsSelections;
  if (input.acceptance !== undefined) updateData.acceptance = input.acceptance;

  const { data, error } = await supabase.from("proposals").update(updateData).eq("id", id).select().single();
  if (error) throw error;
  return mapProposal(data);
}

export async function deleteProposal(id: string) {
  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateProposal(id: string): Promise<Proposal> {
  const source = await getProposal(id);
  if (!source) throw new Error("Proposal not found");
  const newNumber = await getNextProposalNumber();
  
  // Lock AI sections and copy as static content
  const background = { ...source.background, locked: source.background.ai_generated ? true : source.background.locked };
  const scope = { ...source.scope, locked: source.scope.ai_generated ? true : source.scope.locked };

  return createProposal({
    proposalNumber: newNumber,
    status: "draft",
    version: 1,
    clientId: source.clientId,
    projectId: source.projectId,
    estimateId: source.estimateId,
    proposalDate: "",
    expirationDate: "",
    serviceType: source.serviceType,
    siteName: source.siteName,
    siteAddress: source.siteAddress,
    siteAddressLine2: source.siteAddressLine2,
    buildingArea: source.buildingArea,
    secondaryServiceType: source.secondaryServiceType,
    companyRepName: source.companyRepName,
    companyRepTitle: source.companyRepTitle,
    clientSignerName: source.clientSignerName,
    clientSignerTitle: source.clientSignerTitle,
    coverPage: source.coverPage,
    proposalDetails: source.proposalDetails,
    background,
    scope,
    feeItems: source.feeItems,
    termsSelections: source.termsSelections,
    acceptance: source.acceptance,
  });
}

function mapProposal(row: any): Proposal {
  return {
    id: row.id,
    proposalNumber: row.proposal_number,
    status: row.status as ProposalStatus,
    version: row.version,
    clientId: row.client_id,
    projectId: row.project_id,
    estimateId: row.estimate_id,
    proposalDate: row.proposal_date || "",
    expirationDate: row.expiration_date || "",
    serviceType: row.service_type || "",
    siteName: row.site_name || "",
    siteAddress: row.site_address || "",
    siteAddressLine2: (row.cover_page as any)?.siteAddressLine2 || "",
    buildingArea: row.building_area || "",
    secondaryServiceType: (row.cover_page as any)?.secondaryServiceType || "",
    companyRepName: row.company_rep_name || "",
    companyRepTitle: row.company_rep_title || "",
    clientSignerName: row.client_signer_name || "",
    clientSignerTitle: row.client_signer_title || "",
    coverPage: (row.cover_page as Record<string, any>) || {},
    proposalDetails: (row.proposal_details as Record<string, any>) || {},
    background: (row.background as AIContentBlock) || { text: "", ai_generated: false, locked: false, prompt_inputs: {} },
    scope: (row.scope as AIContentBlock) || { text: "", ai_generated: false, locked: false, prompt_inputs: {} },
    feeItems: (row.fee_items as ProposalFeeItem[]) || [],
    termsSelections: (row.terms_selections as ProposalClauseSelection[]) || [],
    acceptance: (row.acceptance as Record<string, any>) || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Clauses ---

export async function getAllClauses(): Promise<ProposalClause[]> {
  const { data, error } = await supabase.from("proposal_clauses").select("*").order("sort_order");
  if (error) throw error;
  return (data || []).map(mapClause);
}

export async function createClause(input: { title: string; body: string; category: string }): Promise<ProposalClause> {
  const { data, error } = await supabase.from("proposal_clauses").insert({
    title: input.title,
    body: input.body,
    category: input.category,
    is_default: false,
    sort_order: 999,
    service_types: [],
  }).select().single();
  if (error) throw error;
  return mapClause(data);
}

function mapClause(row: any): ProposalClause {
  return {
    id: row.id,
    title: row.title,
    body: row.body || "",
    category: row.category || "foundation",
    isDefault: row.is_default,
    sortOrder: row.sort_order,
    serviceTypes: row.service_types || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
