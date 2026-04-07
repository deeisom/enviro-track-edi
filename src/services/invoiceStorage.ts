import { RateItem, Invoice, InvoiceLineItem } from "@/types/invoice";

const KEYS = {
  rates: "epm_rates",
  invoices: "epm_invoices",
  invCounter: "epm_invoice_counter",
  estCounter: "epm_estimate_counter",
};

function read<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function write<T>(key: string, data: T[]) { localStorage.setItem(key, JSON.stringify(data)); }
function genId(): string { return crypto.randomUUID(); }

// --- Rate Items ---
export function getAllRates(): RateItem[] { return read<RateItem>(KEYS.rates); }
export function createRate(data: Omit<RateItem, "id">): RateItem {
  const rates = getAllRates();
  const item: RateItem = { ...data, id: genId() };
  rates.push(item);
  write(KEYS.rates, rates);
  return item;
}
export function updateRate(id: string, data: Partial<RateItem>): RateItem | undefined {
  const rates = getAllRates();
  const idx = rates.findIndex(r => r.id === id);
  if (idx === -1) return undefined;
  rates[idx] = { ...rates[idx], ...data };
  write(KEYS.rates, rates);
  return rates[idx];
}
export function deleteRate(id: string) { write(KEYS.rates, getAllRates().filter(r => r.id !== id)); }

// --- Invoices ---
export function getNextInvoiceNumber(type: "invoice" | "estimate"): string {
  const key = type === "invoice" ? KEYS.invCounter : KEYS.estCounter;
  const prefix = type === "invoice" ? "INV" : "EST";
  const counter = parseInt(localStorage.getItem(key) || "0", 10) + 1;
  localStorage.setItem(key, String(counter));
  return `${prefix}-${String(counter).padStart(4, "0")}`;
}
export function getAllInvoices(): Invoice[] { return read<Invoice>(KEYS.invoices); }
export function getInvoice(id: string): Invoice | undefined { return getAllInvoices().find(i => i.id === id); }
export function getInvoicesByProject(projectId: string): Invoice[] {
  return getAllInvoices().filter(i => i.projectId === projectId);
}
export function createInvoice(data: Omit<Invoice, "id" | "invoiceNumber" | "createdAt" | "updatedAt">): Invoice {
  const invoices = getAllInvoices();
  const invoice: Invoice = {
    ...data,
    id: genId(),
    invoiceNumber: getNextInvoiceNumber(data.type),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  invoices.push(invoice);
  write(KEYS.invoices, invoices);
  return invoice;
}
export function updateInvoice(id: string, data: Partial<Invoice>): Invoice | undefined {
  const invoices = getAllInvoices();
  const idx = invoices.findIndex(i => i.id === id);
  if (idx === -1) return undefined;
  invoices[idx] = { ...invoices[idx], ...data, updatedAt: new Date().toISOString() };
  write(KEYS.invoices, invoices);
  return invoices[idx];
}
export function deleteInvoice(id: string) { write(KEYS.invoices, getAllInvoices().filter(i => i.id !== id)); }
