export interface Project {
  id: string;
  projectNumber: string;
  name: string;
  description: string;
  clientId: string | null;
  contactId: string | null;
  location: string;
  assignedTo: string[];
  notes: string;
  status: ProjectStatus;
  parentProjectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus =
  | "1.0" | "1.1"
  | "2.0"
  | "3.0" | "3.1" | "3.2"
  | "4.0" | "4.1"
  | "5.0"
  | "6.0"
  | "7.0";

export interface StatusDefinition {
  code: ProjectStatus;
  label: string;
  phase: string;
  color: string;
  isArchive: boolean;
}

export const PROJECT_STATUSES: StatusDefinition[] = [
  { code: "1.0", label: "Proposal Phase", phase: "Proposal", color: "hsl(210, 70%, 55%)", isArchive: false },
  { code: "1.1", label: "Placeholder / Archive", phase: "Proposal", color: "hsl(210, 30%, 70%)", isArchive: true },
  { code: "2.0", label: "Planning Phase", phase: "Planning", color: "hsl(270, 60%, 55%)", isArchive: false },
  { code: "3.0", label: "Fieldwork / Active Phase", phase: "Fieldwork", color: "hsl(140, 60%, 40%)", isArchive: false },
  { code: "3.1", label: "Pre-Paid", phase: "Fieldwork", color: "hsl(140, 50%, 50%)", isArchive: false },
  { code: "3.2", label: "Partial Invoice", phase: "Fieldwork", color: "hsl(140, 40%, 55%)", isArchive: false },
  { code: "4.0", label: "Deliverables Phase", phase: "Deliverables", color: "hsl(35, 80%, 50%)", isArchive: false },
  { code: "4.1", label: "Invoiced / Need Final Report", phase: "Deliverables", color: "hsl(35, 60%, 55%)", isArchive: false },
  { code: "5.0", label: "Billing Phase", phase: "Billing", color: "hsl(0, 70%, 55%)", isArchive: false },
  { code: "6.0", label: "Closed / Complete", phase: "Closed", color: "hsl(0, 0%, 50%)", isArchive: true },
  { code: "7.0", label: "Cancelled", phase: "Cancelled", color: "hsl(0, 0%, 65%)", isArchive: true },
];

export function getStatusDef(code: ProjectStatus): StatusDefinition {
  return PROJECT_STATUSES.find(s => s.code === code) || PROJECT_STATUSES[0];
}

export interface Client {
  id: string;
  companyName: string;
  address: string;
  industryType: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  clientId: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  projectId: string;
  projectNumber: string;
  previousStatus: ProjectStatus | null;
  newStatus: ProjectStatus;
  note: string;
  timestamp: string;
}
