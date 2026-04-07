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

// --- Seed Data ---
const SEED_RATES: Omit<RateItem, "id">[] = [
  { name: "Program Administration", description: "Review & update documentation; data interpretation; DOE/DEP forms preparation; project communications & coordination", category: "services", defaultRate: 95, unit: "per hour" },
  { name: "Sample Collection", description: "Fieldwork - on-site first-draw sample collection; field recordation; sample processing", category: "services", defaultRate: 65, unit: "per hour" },
  { name: "Lead in Water - EPA 200.8", description: "Analysis for lead in water per EPA Method 200.8 (ICP-MS); includes QA/QC blanks; 2-week turnaround", category: "analytical", defaultRate: 16, unit: "per sample" },
  { name: "Sample Bottles & Supplies", description: "Supplies; 250ml sample bottles with preservative; gloves, labels", category: "consumables", defaultRate: 4, unit: "each" },
  { name: "Psychrometer/TSI-Calc", description: "Psychrometer/TSI-Calc for temperature and humidity readings at sample locations", category: "equipment", defaultRate: 85, unit: "per day" },
  { name: "Project Manager", description: "Project Manager", category: "services", defaultRate: 78.5, unit: "per hour" },
  { name: "Asbestos Air Monitor", description: "Asbestos Air Monitor", category: "services", defaultRate: 65, unit: "per hour" },
  { name: "Final Report", description: "Final Report", category: "services", defaultRate: 150, unit: "flat" },
  { name: "TEM Air Samples 6-Hour TAT", description: "TEM air samples 6-hour TAT", category: "analytical", defaultRate: 82, unit: "per sample" },
  { name: "Industrial Hygiene Services", description: "Project oversight; onsite sampling and data collection; sample preparation; lab transmittal; data interpretation; final report preparation; project communications", category: "services", defaultRate: 1500, unit: "flat" },
  { name: "Mold in Air Samples", description: "Mold in air samples", category: "analytical", defaultRate: 70, unit: "per sample" },
  { name: "Sampling Cassettes for Mold", description: "Sampling cassettes for mold in air", category: "consumables", defaultRate: 6, unit: "each" },
  { name: "Zefon Sampling Pump", description: "Zefon sampling pump", category: "equipment", defaultRate: 30, unit: "per day" },
];

export function seedRatesIfEmpty(): void {
  if (getAllRates().length === 0) {
    SEED_RATES.forEach(r => createRate(r));
  }
}

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
