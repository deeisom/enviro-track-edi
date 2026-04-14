export type RateCategory = "services" | "equipment" | "analytical" | "consumables" | "other";

export interface RateItem {
  id: string;
  name: string;
  item: string;
  itemDescription: string;
  category: RateCategory;
  defaultRate: number;
  unit: string; // "per hour", "per day", "per sample", "flat"
}

export interface InvoiceLineItem {
  id: string;
  rateItemId?: string;
  name: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

export type InvoiceType = "estimate" | "invoice";
export type InvoiceStatus = "draft" | "sent" | "paid";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  projectId: string | null;
  clientId: string | null;
  parentInvoiceId: string | null;
  billTo: { name: string; address: string };
  poNumber: string;
  date: string;
  dueDate: string;
  terms: string;
  projectSummary: string;
  lineItems: InvoiceLineItem[];
  total: number;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}

export const RATE_CATEGORIES: { value: RateCategory; label: string }[] = [
  { value: "services", label: "Services (Hourly)" },
  { value: "equipment", label: "Equipment" },
  { value: "analytical", label: "Analytical / Lab" },
  { value: "consumables", label: "Consumables" },
  { value: "other", label: "Other" },
];
