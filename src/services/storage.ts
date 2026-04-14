import { supabase } from "@/integrations/supabase/client";
import { Project, Client, Contact, ActivityLogEntry, ProjectStatus } from "@/types";

// --- Projects ---

export async function getNextProjectNumber(): Promise<string> {
  const { data, error } = await supabase.rpc("get_next_project_number");
  if (error) throw error;
  return data as string;
}

export async function getAllProjects(): Promise<Project[]> {
  const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapProject);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapProject(data) : undefined;
}

export async function createProject(input: Omit<Project, "id" | "projectNumber" | "createdAt" | "updatedAt"> & { manualProjectNumber?: string }): Promise<Project> {
  const projectNumber = input.manualProjectNumber || await getNextProjectNumber();
  const { data, error } = await supabase.from("projects").insert({
    project_number: projectNumber,
    name: input.name,
    description: input.description,
    client_id: (input.clientId && input.clientId !== "_none") ? input.clientId : null,
    contact_id: (input.contactId && input.contactId !== "_none") ? input.contactId : null,
    location: input.location,
    assigned_to: input.assignedTo,
    notes: input.notes,
    status: input.status,
    parent_project_id: (input.parentProjectId && input.parentProjectId !== "_none") ? input.parentProjectId : null,
  } as any).select().single();
  if (error) throw error;
  const project = mapProject(data);

  await addActivity({
    projectId: project.id,
    projectNumber: project.projectNumber,
    previousStatus: null,
    newStatus: project.status,
    note: "Project created",
  });

  return project;
}

export async function updateProject(id: string, input: Partial<Project>): Promise<Project | undefined> {
  const old = await getProject(id);
  if (!old) return undefined;

  const updateData: any = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.location !== undefined) updateData.location = input.location;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.clientId !== undefined) updateData.client_id = input.clientId;
  if (input.contactId !== undefined) updateData.contact_id = input.contactId;
  if (input.assignedTo !== undefined) updateData.assigned_to = input.assignedTo;
  if (input.parentProjectId !== undefined) updateData.parent_project_id = input.parentProjectId;

  const { data, error } = await supabase.from("projects").update(updateData).eq("id", id).select().single();
  if (error) throw error;

  if (input.status && input.status !== old.status) {
    await addActivity({
      projectId: id,
      projectNumber: old.projectNumber,
      previousStatus: old.status,
      newStatus: input.status,
      note: "",
    });
  }

  return mapProject(data);
}

export async function changeProjectStatus(id: string, newStatus: ProjectStatus, note: string = ""): Promise<Project | undefined> {
  const old = await getProject(id);
  if (!old) return undefined;

  const { data, error } = await supabase.from("projects").update({ status: newStatus }).eq("id", id).select().single();
  if (error) throw error;

  await addActivity({
    projectId: id,
    projectNumber: old.projectNumber,
    previousStatus: old.status,
    newStatus,
    note,
  });

  return mapProject(data);
}

function mapProject(row: any): Project {
  return {
    id: row.id,
    projectNumber: row.project_number,
    name: row.name,
    description: row.description || "",
    clientId: row.client_id,
    contactId: row.contact_id,
    location: row.location || "",
    assignedTo: row.assigned_to || [],
    notes: row.notes || "",
    status: row.status as ProjectStatus,
    parentProjectId: row.parent_project_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Clients ---

export async function getAllClients(): Promise<Client[]> {
  const { data, error } = await supabase.from("clients").select("*").order("company_name");
  if (error) throw error;
  return (data || []).map(mapClient);
}

export async function getClient(id: string): Promise<Client | undefined> {
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapClient(data) : undefined;
}

export async function createClient(input: Omit<Client, "id" | "createdAt" | "updatedAt">): Promise<Client> {
  const { data, error } = await supabase.from("clients").insert({
    company_name: input.companyName,
    address: input.address,
    industry_type: input.industryType,
    notes: input.notes,
    phone: input.phone,
    fax: input.fax,
    website: input.website,
  } as any).select().single();
  if (error) throw error;
  return mapClient(data);
}

export async function updateClient(id: string, input: Partial<Client>): Promise<Client | undefined> {
  const updateData: any = {};
  if (input.companyName !== undefined) updateData.company_name = input.companyName;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.industryType !== undefined) updateData.industry_type = input.industryType;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.fax !== undefined) updateData.fax = input.fax;
  if (input.website !== undefined) updateData.website = input.website;

  const { data, error } = await supabase.from("clients").update(updateData).eq("id", id).select().single();
  if (error) throw error;
  return mapClient(data);
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

function mapClient(row: any): Client {
  return {
    id: row.id,
    companyName: row.company_name,
    address: row.address || "",
    industryType: row.industry_type || "",
    notes: row.notes || "",
    phone: row.phone || "",
    fax: row.fax || "",
    website: row.website || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Contacts ---

export async function getAllContacts(): Promise<Contact[]> {
  const { data, error } = await supabase.from("contacts").select("*");
  if (error) throw error;
  return (data || []).map(mapContact);
}

export async function getContactsByClient(clientId: string): Promise<Contact[]> {
  const { data, error } = await supabase.from("contacts").select("*").eq("client_id", clientId);
  if (error) throw error;
  return (data || []).map(mapContact);
}

export async function createContact(input: Omit<Contact, "id" | "createdAt">): Promise<Contact> {
  const { data, error } = await supabase.from("contacts").insert({
    client_id: input.clientId,
    name: input.name,
    title: input.title,
    email: input.email,
    phone: input.phone,
    mobile_phone: input.mobilePhone,
    secondary_email: input.secondaryEmail,
  } as any).select().single();
  if (error) throw error;
  return mapContact(data);
}

export async function updateContact(id: string, input: Partial<Contact>): Promise<Contact | undefined> {
  const updateData: any = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.mobilePhone !== undefined) updateData.mobile_phone = input.mobilePhone;
  if (input.secondaryEmail !== undefined) updateData.secondary_email = input.secondaryEmail;

  const { data, error } = await supabase.from("contacts").update(updateData).eq("id", id).select().single();
  if (error) throw error;
  return mapContact(data);
}

export async function deleteContact(id: string) {
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw error;
}

function mapContact(row: any): Contact {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    title: row.title || "",
    email: row.email || "",
    phone: row.phone || "",
    mobilePhone: row.mobile_phone || "",
    secondaryEmail: row.secondary_email || "",
    createdAt: row.created_at,
  };
}

// --- Activity Log ---

export async function getAllActivity(): Promise<ActivityLogEntry[]> {
  const { data, error } = await supabase.from("activity_log").select("*").order("timestamp", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapActivity);
}

export async function getProjectActivity(projectId: string): Promise<ActivityLogEntry[]> {
  const { data, error } = await supabase.from("activity_log").select("*").eq("project_id", projectId).order("timestamp", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapActivity);
}

async function addActivity(input: Omit<ActivityLogEntry, "id" | "timestamp">) {
  await supabase.from("activity_log").insert({
    project_id: input.projectId,
    project_number: input.projectNumber,
    previous_status: input.previousStatus,
    new_status: input.newStatus,
    note: input.note || "",
    invoice_id: input.invoiceId || null,
    invoice_number: input.invoiceNumber || null,
    is_invoice_event: input.isInvoiceEvent || false,
  } as any);
}

export async function deleteActivity(id: string) {
  const { error } = await supabase.from("activity_log").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

export async function addInvoiceActivity(input: {
  projectId: string;
  projectNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  note: string;
  newStatus: ProjectStatus;
}) {
  await supabase.from("activity_log").insert({
    project_id: input.projectId,
    project_number: input.projectNumber,
    previous_status: null,
    new_status: input.newStatus,
    note: input.note,
    invoice_id: input.invoiceId,
    invoice_number: input.invoiceNumber,
    is_invoice_event: true,
  } as any);
}

function mapActivity(row: any): ActivityLogEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    projectNumber: row.project_number,
    previousStatus: row.previous_status as ProjectStatus | null,
    newStatus: row.new_status as ProjectStatus,
    note: row.note || "",
    timestamp: row.timestamp,
    invoiceId: row.invoice_id || undefined,
    invoiceNumber: row.invoice_number || undefined,
    isInvoiceEvent: row.is_invoice_event || false,
  };
}
