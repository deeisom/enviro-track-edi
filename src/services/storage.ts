import { Project, Client, Contact, ActivityLogEntry, ProjectStatus } from "@/types";

const KEYS = {
  projects: "epm_projects",
  clients: "epm_clients",
  contacts: "epm_contacts",
  activity: "epm_activity",
  counter: "epm_project_counter",
};

function read<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function write<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

function genId(): string {
  return crypto.randomUUID();
}

// --- Projects ---

export function getNextProjectNumber(): string {
  const counter = parseInt(localStorage.getItem(KEYS.counter) || "0", 10) + 1;
  localStorage.setItem(KEYS.counter, String(counter));
  return `PR-${String(counter).padStart(4, "0")}`;
}

export function getAllProjects(): Project[] {
  return read<Project>(KEYS.projects);
}

export function getProject(id: string): Project | undefined {
  return getAllProjects().find(p => p.id === id);
}

export function createProject(data: Omit<Project, "id" | "projectNumber" | "createdAt" | "updatedAt">): Project {
  const projects = getAllProjects();
  const project: Project = {
    ...data,
    id: genId(),
    projectNumber: getNextProjectNumber(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projects.push(project);
  write(KEYS.projects, projects);

  addActivity({
    projectId: project.id,
    projectNumber: project.projectNumber,
    previousStatus: null,
    newStatus: project.status,
    note: "Project created",
  });

  return project;
}

export function updateProject(id: string, data: Partial<Project>): Project | undefined {
  const projects = getAllProjects();
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) return undefined;

  const old = projects[idx];
  const updated = { ...old, ...data, updatedAt: new Date().toISOString() };
  projects[idx] = updated;
  write(KEYS.projects, projects);

  if (data.status && data.status !== old.status) {
    addActivity({
      projectId: id,
      projectNumber: old.projectNumber,
      previousStatus: old.status,
      newStatus: data.status,
      note: "",
    });
  }

  return updated;
}

export function changeProjectStatus(id: string, newStatus: ProjectStatus, note: string = ""): Project | undefined {
  const projects = getAllProjects();
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) return undefined;

  const old = projects[idx];
  projects[idx] = { ...old, status: newStatus, updatedAt: new Date().toISOString() };
  write(KEYS.projects, projects);

  addActivity({
    projectId: id,
    projectNumber: old.projectNumber,
    previousStatus: old.status,
    newStatus,
    note,
  });

  return projects[idx];
}

// --- Clients ---

export function getAllClients(): Client[] {
  return read<Client>(KEYS.clients);
}

export function getClient(id: string): Client | undefined {
  return getAllClients().find(c => c.id === id);
}

export function createClient(data: Omit<Client, "id" | "createdAt" | "updatedAt">): Client {
  const clients = getAllClients();
  const client: Client = {
    ...data,
    id: genId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  clients.push(client);
  write(KEYS.clients, clients);
  return client;
}

export function updateClient(id: string, data: Partial<Client>): Client | undefined {
  const clients = getAllClients();
  const idx = clients.findIndex(c => c.id === id);
  if (idx === -1) return undefined;
  clients[idx] = { ...clients[idx], ...data, updatedAt: new Date().toISOString() };
  write(KEYS.clients, clients);
  return clients[idx];
}

export function deleteClient(id: string) {
  write(KEYS.clients, getAllClients().filter(c => c.id !== id));
  write(KEYS.contacts, getAllContacts().filter(c => c.clientId !== id));
}

// --- Contacts ---

export function getAllContacts(): Contact[] {
  return read<Contact>(KEYS.contacts);
}

export function getContactsByClient(clientId: string): Contact[] {
  return getAllContacts().filter(c => c.clientId === clientId);
}

export function createContact(data: Omit<Contact, "id" | "createdAt">): Contact {
  const contacts = getAllContacts();
  const contact: Contact = { ...data, id: genId(), createdAt: new Date().toISOString() };
  contacts.push(contact);
  write(KEYS.contacts, contacts);
  return contact;
}

export function updateContact(id: string, data: Partial<Contact>): Contact | undefined {
  const contacts = getAllContacts();
  const idx = contacts.findIndex(c => c.id === id);
  if (idx === -1) return undefined;
  contacts[idx] = { ...contacts[idx], ...data };
  write(KEYS.contacts, contacts);
  return contacts[idx];
}

export function deleteContact(id: string) {
  write(KEYS.contacts, getAllContacts().filter(c => c.id !== id));
}

// --- Activity Log ---

export function getAllActivity(): ActivityLogEntry[] {
  return read<ActivityLogEntry>(KEYS.activity).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getProjectActivity(projectId: string): ActivityLogEntry[] {
  return getAllActivity().filter(a => a.projectId === projectId);
}

function addActivity(data: Omit<ActivityLogEntry, "id" | "timestamp">) {
  const activity = read<ActivityLogEntry>(KEYS.activity);
  activity.push({ ...data, id: genId(), timestamp: new Date().toISOString() });
  write(KEYS.activity, activity);
}

export function deleteActivity(id: string) {
  write(KEYS.activity, read<ActivityLogEntry>(KEYS.activity).filter(a => a.id !== id));
}

export function addInvoiceActivity(data: {
  projectId: string;
  projectNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  note: string;
  newStatus: ProjectStatus;
}) {
  const activity = read<ActivityLogEntry>(KEYS.activity);
  activity.push({
    ...data,
    id: genId(),
    previousStatus: null,
    timestamp: new Date().toISOString(),
    isInvoiceEvent: true,
  });
  write(KEYS.activity, activity);
}
