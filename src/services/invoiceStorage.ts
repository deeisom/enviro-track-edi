import { supabase } from "@/integrations/supabase/client";
import { RateItem, Invoice, InvoiceLineItem } from "@/types/invoice";

// --- Rate Items ---

export async function getAllRates(): Promise<RateItem[]> {
  const { data, error } = await supabase.from("rates").select("*").order("name");
  if (error) throw error;
  return (data || []).map(mapRate);
}

export async function createRate(input: Omit<RateItem, "id">): Promise<RateItem> {
  const { data, error } = await supabase.from("rates").insert({
    name: input.name,
    description: input.description,
    category: input.category,
    default_rate: input.defaultRate,
    unit: input.unit,
  }).select().single();
  if (error) throw error;
  return mapRate(data);
}

export async function updateRate(id: string, input: Partial<RateItem>): Promise<RateItem | undefined> {
  const updateData: Record<string, any> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.defaultRate !== undefined) updateData.default_rate = input.defaultRate;
  if (input.unit !== undefined) updateData.unit = input.unit;

  const { data, error } = await supabase.from("rates").update(updateData).eq("id", id).select().single();
  if (error) throw error;
  return mapRate(data);
}

export async function deleteRate(id: string) {
  const { error } = await supabase.from("rates").delete().eq("id", id);
  if (error) throw error;
}

// seedRatesIfEmpty is no longer needed — rates are seeded in the migration
export function seedRatesIfEmpty() {}

function mapRate(row: any): RateItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    category: row.category as RateItem["category"],
    defaultRate: Number(row.default_rate),
    unit: row.unit,
  };
}

// --- Invoices ---

export async function getNextInvoiceNumber(type: "invoice" | "estimate"): Promise<string> {
  const { data, error } = await supabase.rpc("get_next_invoice_number", { _type: type });
  if (error) throw error;
  return data as string;
}

export async function getAllInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapInvoice);
}

export async function getInvoice(id: string): Promise<Invoice | undefined> {
  const { data, error } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapInvoice(data) : undefined;
}

export async function getInvoicesByProject(projectId: string): Promise<Invoice[]> {
  const { data, error } = await supabase.from("invoices").select("*").eq("project_id", projectId);
  if (error) throw error;
  return (data || []).map(mapInvoice);
}

export async function createInvoice(input: Omit<Invoice, "id" | "invoiceNumber" | "createdAt" | "updatedAt">): Promise<Invoice> {
  const invoiceNumber = await getNextInvoiceNumber(input.type);
  const { data, error } = await supabase.from("invoices").insert({
    invoice_number: invoiceNumber,
    type: input.type,
    project_id: input.projectId || null,
    client_id: input.clientId || null,
    bill_to: input.billTo as any,
    po_number: input.poNumber,
    date: input.date,
    due_date: input.dueDate,
    terms: input.terms,
    project_summary: input.projectSummary,
    line_items: input.lineItems as any,
    total: input.total,
    status: input.status,
  }).select().single();
  if (error) throw error;
  return mapInvoice(data);
}

export async function updateInvoice(id: string, input: Partial<Invoice>): Promise<Invoice | undefined> {
  const updateData: Record<string, any> = {};
  if (input.type !== undefined) updateData.type = input.type;
  if (input.projectId !== undefined) updateData.project_id = input.projectId;
  if (input.clientId !== undefined) updateData.client_id = input.clientId;
  if (input.billTo !== undefined) updateData.bill_to = input.billTo;
  if (input.poNumber !== undefined) updateData.po_number = input.poNumber;
  if (input.date !== undefined) updateData.date = input.date;
  if (input.dueDate !== undefined) updateData.due_date = input.dueDate;
  if (input.terms !== undefined) updateData.terms = input.terms;
  if (input.projectSummary !== undefined) updateData.project_summary = input.projectSummary;
  if (input.lineItems !== undefined) updateData.line_items = input.lineItems;
  if (input.total !== undefined) updateData.total = input.total;
  if (input.status !== undefined) updateData.status = input.status;

  const { data, error } = await supabase.from("invoices").update(updateData).eq("id", id).select().single();
  if (error) throw error;
  return mapInvoice(data);
}

export async function deleteInvoice(id: string) {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}

function mapInvoice(row: any): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    type: row.type as Invoice["type"],
    projectId: row.project_id,
    clientId: row.client_id,
    billTo: (row.bill_to as any) || { name: "", address: "" },
    poNumber: row.po_number || "",
    date: row.date || "",
    dueDate: row.due_date || "",
    terms: row.terms || "",
    projectSummary: row.project_summary || "",
    lineItems: (row.line_items as InvoiceLineItem[]) || [],
    total: Number(row.total),
    status: row.status as Invoice["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
