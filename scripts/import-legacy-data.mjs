import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

const VALID_PROJECT_STATUSES = new Set(["1.0", "1.1", "2.0", "3.0", "3.1", "3.2", "4.0", "4.1", "5.0", "6.0", "7.0"]);
const STATUS_LABELS = new Map([
  ["proposalphase", "1.0"],
  ["proposal", "1.0"],
  ["placeholderarchive", "1.1"],
  ["placeholder", "1.1"],
  ["planningphase", "2.0"],
  ["planning", "2.0"],
  ["fieldworkactivephase", "3.0"],
  ["fieldwork", "3.0"],
  ["active", "3.0"],
  ["prepaid", "3.1"],
  ["partialinvoice", "3.2"],
  ["deliverablesphase", "4.0"],
  ["deliverables", "4.0"],
  ["invoicedneedfinalreport", "4.1"],
  ["billingphase", "5.0"],
  ["billing", "5.0"],
  ["closedcomplete", "6.0"],
  ["closed", "6.0"],
  ["complete", "6.0"],
  ["cancelled", "7.0"],
  ["canceled", "7.0"],
]);

const FIELD_ALIASES = {
  client: {
    companyName: ["company name", "company", "client", "client name", "organization", "customer", "business"],
    address: ["address", "company address", "client address", "mailing address", "street address"],
    industryType: ["industry type", "industry", "type", "market"],
    notes: ["notes", "note", "comments", "comment"],
    phone: ["phone", "company phone", "client phone", "main phone", "office phone"],
    fax: ["fax", "fax number"],
    website: ["website", "web site", "url"],
  },
  contact: {
    company: ["company", "company name", "client", "client name", "organization", "customer", "business"],
    name: ["contact name", "name", "full name", "contact"],
    title: ["title", "job title", "position"],
    email: ["email", "e-mail", "primary email", "contact email"],
    phone: ["phone", "office phone", "contact phone"],
    mobilePhone: ["mobile phone", "mobile", "cell", "cell phone"],
    secondaryEmail: ["secondary email", "email 2", "email2", "alternate email", "alt email"],
  },
  project: {
    projectNumber: ["project number", "project #", "project no", "project id", "job number", "edi project #"],
    name: ["project name", "name", "job name", "site name"],
    description: ["description", "project description", "scope"],
    company: ["company", "company name", "client", "client name", "organization", "customer", "business"],
    location: ["location", "address", "site address", "project location"],
    status: ["status", "status code", "project status"],
    assignedTo: ["assigned to", "assigned", "staff", "team", "project manager"],
    notes: ["notes", "note", "comments", "comment"],
  },
};

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\uFEFF/g, "").trim();
}

export function normalizeKey(value) {
  return cleanText(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
}

export function normalizeCompanyName(value) {
  const withoutSuffix = cleanText(value)
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\b(the|llc|inc|incorporated|corp|corporation|co|company|ltd|limited)\b/g, " ");
  return normalizeKey(withoutSuffix);
}

function normalizePersonName(value) {
  return normalizeKey(value);
}

function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

function pick(row, aliases) {
  for (const alias of aliases) {
    const value = row[normalizeKey(alias)];
    const cleaned = cleanText(value);
    if (cleaned) return cleaned;
  }
  return "";
}

function splitAssignedTo(value) {
  return cleanText(value)
    .split(/[;,]/)
    .map(part => part.trim())
    .filter(Boolean);
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      row.push(cell);
      cell = "";
      if (row.some(value => cleanText(value))) rows.push(row);
      row = [];
      if (char === "\r" && next === "\n") i++;
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some(value => cleanText(value))) rows.push(row);
  return rows;
}

export function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(normalizeKey);

  return rows.slice(1).map((row, index) => {
    const out = { __rowNumber: index + 2 };
    headers.forEach((header, col) => {
      if (header) out[header] = cleanText(row[col]);
    });
    return out;
  }).filter(row => Object.keys(row).some(key => key !== "__rowNumber" && cleanText(row[key])));
}

function excelCellToText(cell) {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  if (typeof cell !== "object") return cleanText(cell);
  if ("text" in cell) return cleanText(cell.text);
  if ("result" in cell) return cleanText(cell.result);
  if ("richText" in cell) return cell.richText.map(part => part.text || "").join("").trim();
  if ("hyperlink" in cell) return cleanText(cell.hyperlink);
  return cleanText(cell);
}

async function readTabularFile(filePath, sheetName) {
  const resolved = path.resolve(filePath);
  const ext = path.extname(resolved).toLowerCase();

  if (ext === ".csv" || ext === ".tsv") {
    const delimiter = ext === ".tsv" ? "\t" : ",";
    const content = fs.readFileSync(resolved, "utf8");
    const rows = delimiter === "," ? parseCsv(content) : content.split(/\r?\n/).map(line => line.split("\t"));
    return rowsToObjects(rows);
  }

  if (ext === ".xlsx") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(resolved);
    const worksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
    if (!worksheet) throw new Error(`Could not find worksheet "${sheetName}" in ${resolved}`);
    const rows = [];
    worksheet.eachRow({ includeEmpty: false }, row => {
      rows.push(row.values.slice(1).map(excelCellToText));
    });
    return rowsToObjects(rows);
  }

  throw new Error(`Unsupported import file type: ${resolved}. Use CSV, TSV, or XLSX.`);
}

function normalizeProjectStatus(value) {
  const cleaned = cleanText(value);
  if (!cleaned) return { status: "1.0", warning: null };
  if (VALID_PROJECT_STATUSES.has(cleaned)) return { status: cleaned, warning: null };

  const mapped = STATUS_LABELS.get(normalizeKey(cleaned));
  if (mapped) return { status: mapped, warning: null };

  return { status: "1.0", warning: `Unknown status "${cleaned}" defaulted to 1.0` };
}

function normalizeClientRow(row, sourceName) {
  const a = FIELD_ALIASES.client;
  return {
    sourceName,
    rowNumber: row.__rowNumber,
    companyName: pick(row, a.companyName),
    address: pick(row, a.address),
    industryType: pick(row, a.industryType),
    notes: pick(row, a.notes),
    phone: pick(row, a.phone),
    fax: pick(row, a.fax),
    website: pick(row, a.website),
  };
}

function normalizeContactRow(row, sourceName) {
  const a = FIELD_ALIASES.contact;
  return {
    sourceName,
    rowNumber: row.__rowNumber,
    company: pick(row, a.company),
    name: pick(row, a.name),
    title: pick(row, a.title),
    email: pick(row, a.email),
    phone: pick(row, a.phone),
    mobilePhone: pick(row, a.mobilePhone),
    secondaryEmail: pick(row, a.secondaryEmail),
  };
}

function normalizeProjectRow(row, sourceName) {
  const a = FIELD_ALIASES.project;
  const status = normalizeProjectStatus(pick(row, a.status));
  const projectNumber = pick(row, a.projectNumber);

  return {
    sourceName,
    rowNumber: row.__rowNumber,
    projectNumber,
    name: pick(row, a.name) || projectNumber,
    description: pick(row, a.description),
    company: pick(row, a.company),
    location: pick(row, a.location),
    status: status.status,
    assignedTo: splitAssignedTo(pick(row, a.assignedTo)),
    notes: pick(row, a.notes),
    warning: status.warning,
  };
}

function coerceExistingClient(row) {
  return {
    id: row.id,
    companyName: cleanText(row.companyName ?? row.company_name),
    address: cleanText(row.address),
    industryType: cleanText(row.industryType ?? row.industry_type),
    notes: cleanText(row.notes),
    phone: cleanText(row.phone),
    fax: cleanText(row.fax),
    website: cleanText(row.website),
  };
}

function coerceExistingContact(row) {
  return {
    id: row.id,
    clientId: row.clientId ?? row.client_id,
    name: cleanText(row.name),
    title: cleanText(row.title),
    email: cleanText(row.email),
    phone: cleanText(row.phone),
    mobilePhone: cleanText(row.mobilePhone ?? row.mobile_phone),
    secondaryEmail: cleanText(row.secondaryEmail ?? row.secondary_email),
  };
}

function coerceExistingProject(row) {
  return {
    id: row.id,
    projectNumber: cleanText(row.projectNumber ?? row.project_number),
    name: cleanText(row.name),
    clientId: row.clientId ?? row.client_id ?? null,
  };
}

function makeClientAction(client, reason, clientRef) {
  return {
    clientRef,
    reason,
    companyName: client.companyName,
    address: client.address || "",
    industryType: client.industryType || "",
    notes: client.notes || "",
    phone: client.phone || "",
    fax: client.fax || "",
    website: client.website || "",
    source: `${client.sourceName || "source"} row ${client.rowNumber || "?"}`,
  };
}

function mergeClientDetails(target, source) {
  for (const field of ["address", "industryType", "notes", "phone", "fax", "website"]) {
    if (!target[field] && source[field]) target[field] = source[field];
  }
}

function parseProjectCounter(projectNumber, year) {
  const match = cleanText(projectNumber).match(new RegExp(`^EDI-${year}-(\\d+)$`, "i"));
  return match ? Number(match[1]) : 0;
}

export function buildImportPlan({
  clients = [],
  contacts = [],
  projects = [],
  existingClients = [],
  existingContacts = [],
  existingProjects = [],
  existingProjectCounter = 0,
  now = new Date(),
} = {}) {
  const issues = [];
  const clientCreates = [];
  const clientSkipped = [];
  const contactCreates = [];
  const contactSkipped = [];
  const projectCreates = [];
  const projectSkipped = [];
  const plannedClientsByNorm = new Map();
  const clientRefByNorm = new Map();

  const existingClientGroups = new Map();
  existingClients.map(coerceExistingClient).forEach(client => {
    const norm = normalizeCompanyName(client.companyName);
    if (!norm) return;
    const group = existingClientGroups.get(norm) || [];
    group.push(client);
    existingClientGroups.set(norm, group);
  });

  const existingContactsByClient = new Map();
  existingContacts.map(coerceExistingContact).forEach(contact => {
    const list = existingContactsByClient.get(contact.clientId) || [];
    list.push(contact);
    existingContactsByClient.set(contact.clientId, list);
  });

  const existingProjectNumbers = new Set(existingProjects.map(coerceExistingProject).map(project => project.projectNumber).filter(Boolean));
  const plannedProjectNumbers = new Set();
  const plannedContactKeys = new Set();

  function resolveClient(companyName, details = {}, reason = "referenced") {
    const cleanedCompany = cleanText(companyName);
    const norm = normalizeCompanyName(cleanedCompany);
    if (!norm) return { status: "missing" };

    const existingMatches = existingClientGroups.get(norm) || [];
    if (existingMatches.length === 1) {
      clientRefByNorm.set(norm, { type: "existing", id: existingMatches[0].id, label: existingMatches[0].companyName });
      return { status: "existing", id: existingMatches[0].id, label: existingMatches[0].companyName };
    }

    if (existingMatches.length > 1) {
      issues.push({
        type: "ambiguous_client_match",
        message: `Multiple existing clients match "${cleanedCompany}".`,
        companyName: cleanedCompany,
        existingClientIds: existingMatches.map(client => client.id),
      });
      return { status: "ambiguous", label: cleanedCompany };
    }

    const existingPlan = plannedClientsByNorm.get(norm);
    if (existingPlan) {
      mergeClientDetails(existingPlan, details);
      return { status: "planned", clientRef: existingPlan.clientRef, label: existingPlan.companyName };
    }

    const clientRef = `client:${norm}`;
    const action = makeClientAction({ companyName: cleanedCompany, ...details }, reason, clientRef);
    plannedClientsByNorm.set(norm, action);
    clientCreates.push(action);
    clientRefByNorm.set(norm, { type: "planned", clientRef, label: cleanedCompany });
    return { status: "planned", clientRef, label: cleanedCompany };
  }

  for (const rawClient of clients.map(row => normalizeClientRow(row, "clients"))) {
    if (!rawClient.companyName) {
      issues.push({ type: "missing_client_company", message: "Client row skipped because company name is blank.", source: `${rawClient.sourceName} row ${rawClient.rowNumber}` });
      continue;
    }

    const resolved = resolveClient(rawClient.companyName, rawClient, "client file");
    if (resolved.status === "existing") {
      clientSkipped.push({ companyName: rawClient.companyName, reason: "already exists", source: `${rawClient.sourceName} row ${rawClient.rowNumber}` });
    }
  }

  const normalizedContacts = contacts.map(row => normalizeContactRow(row, "contacts"));
  for (const contact of normalizedContacts) {
    if (contact.company) resolveClient(contact.company, { companyName: contact.company }, "contact file");
  }

  const normalizedProjects = projects.map(row => normalizeProjectRow(row, "projects"));
  for (const project of normalizedProjects) {
    if (project.company) resolveClient(project.company, { companyName: project.company }, "project file");
  }

  for (const contact of normalizedContacts) {
    const source = `${contact.sourceName} row ${contact.rowNumber}`;
    if (!contact.company) {
      issues.push({ type: "missing_contact_company", message: "Contact row skipped because company is blank.", source });
      continue;
    }
    if (!contact.name) {
      issues.push({ type: "missing_contact_name", message: "Contact row skipped because contact name is blank.", companyName: contact.company, source });
      continue;
    }

    const client = resolveClient(contact.company, { companyName: contact.company }, "contact file");
    if (client.status === "ambiguous") {
      issues.push({ type: "contact_ambiguous_client", message: `Contact "${contact.name}" skipped because "${contact.company}" has multiple matches.`, source });
      continue;
    }
    if (client.status === "missing") {
      issues.push({ type: "contact_missing_client", message: `Contact "${contact.name}" skipped because no client could be resolved.`, source });
      continue;
    }

    const clientKey = client.id || client.clientRef;
    const contactKey = `${clientKey}|${normalizePersonName(contact.name)}|${contact.email ? normalizeEmail(contact.email) : ""}`;
    const existingForClient = client.id ? existingContactsByClient.get(client.id) || [] : [];
    const alreadyExists = existingForClient.some(existing => {
      const sameName = normalizePersonName(existing.name) === normalizePersonName(contact.name);
      const sameEmail = contact.email ? normalizeEmail(existing.email) === normalizeEmail(contact.email) : true;
      return sameName && sameEmail;
    });

    if (alreadyExists) {
      contactSkipped.push({ name: contact.name, companyName: contact.company, email: contact.email, reason: "already exists", source });
      continue;
    }
    if (plannedContactKeys.has(contactKey)) {
      contactSkipped.push({ name: contact.name, companyName: contact.company, email: contact.email, reason: "duplicate in source", source });
      continue;
    }

    plannedContactKeys.add(contactKey);
    contactCreates.push({
      clientRef: client.clientRef || null,
      existingClientId: client.id || null,
      companyName: client.label,
      name: contact.name,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      mobilePhone: contact.mobilePhone,
      secondaryEmail: contact.secondaryEmail,
      source,
    });
  }

  for (const project of normalizedProjects) {
    const source = `${project.sourceName} row ${project.rowNumber}`;
    if (!project.projectNumber) {
      issues.push({ type: "missing_project_number", message: "Project row skipped because project number is blank.", source });
      continue;
    }
    if (existingProjectNumbers.has(project.projectNumber)) {
      projectSkipped.push({ projectNumber: project.projectNumber, name: project.name, reason: "project number already exists", source });
      continue;
    }
    if (plannedProjectNumbers.has(project.projectNumber)) {
      projectSkipped.push({ projectNumber: project.projectNumber, name: project.name, reason: "duplicate project number in source", source });
      continue;
    }

    let client = { status: "missing" };
    if (project.company) client = resolveClient(project.company, { companyName: project.company }, "project file");
    if (!project.company) {
      issues.push({ type: "project_unlinked_client", message: `Project ${project.projectNumber} has no company and will be imported without a client link.`, source });
    } else if (client.status === "ambiguous") {
      issues.push({ type: "project_ambiguous_client", message: `Project ${project.projectNumber} will be imported without a client link because "${project.company}" has multiple matches.`, source });
    }
    if (project.warning) {
      issues.push({ type: "project_status_defaulted", message: `${project.warning} for project ${project.projectNumber}.`, source });
    }

    plannedProjectNumbers.add(project.projectNumber);
    projectCreates.push({
      projectNumber: project.projectNumber,
      name: project.name || project.projectNumber,
      description: project.description,
      clientRef: client.clientRef || null,
      existingClientId: client.id || null,
      companyName: client.label || project.company || "",
      location: project.location,
      assignedTo: project.assignedTo,
      notes: project.notes,
      status: project.status,
      parentProjectId: null,
      source,
    });
  }

  const currentYear = now.getFullYear();
  const highestCurrentYearProject = [
    ...existingProjects.map(coerceExistingProject).map(project => project.projectNumber),
    ...projectCreates.map(project => project.projectNumber),
  ].reduce((max, projectNumber) => Math.max(max, parseProjectCounter(projectNumber, currentYear)), 0);
  const counterUpdate = highestCurrentYearProject > existingProjectCounter
    ? { year: currentYear, from: existingProjectCounter, to: highestCurrentYearProject }
    : null;

  return {
    generatedAt: now.toISOString(),
    mode: "dry-run",
    summary: {
      clientsToCreate: clientCreates.length,
      contactsToCreate: contactCreates.length,
      projectsToCreate: projectCreates.length,
      clientsSkipped: clientSkipped.length,
      contactsSkipped: contactSkipped.length,
      projectsSkipped: projectSkipped.length,
      issues: issues.length,
      counterWillUpdate: Boolean(counterUpdate),
    },
    creates: { clients: clientCreates, contacts: contactCreates, projects: projectCreates },
    skipped: { clients: clientSkipped, contacts: contactSkipped, projects: projectSkipped },
    issues,
    counterUpdate,
  };
}

async function fetchAllPaged(supabase, table, orderColumn = "id") {
  const out = [];
  for (let from = 0; from < 200000; from += 1000) {
    const { data, error } = await supabase.from(table).select("*").order(orderColumn).range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function loadExistingData(supabase) {
  const [clients, contacts, projects, counters] = await Promise.all([
    fetchAllPaged(supabase, "clients", "company_name"),
    fetchAllPaged(supabase, "contacts", "name"),
    fetchAllPaged(supabase, "projects", "project_number"),
    fetchAllPaged(supabase, "project_counter", "year"),
  ]);

  const currentYear = new Date().getFullYear();
  const counter = counters.find(row => Number(row.year) === currentYear)?.counter || 0;
  return { clients, contacts, projects, projectCounter: Number(counter) || 0 };
}

async function loadSourceData(args) {
  const clients = args.clients ? await readTabularFile(args.clients, args.clientsSheet) : [];
  const contacts = args.contacts ? await readTabularFile(args.contacts, args.contactsSheet) : [];
  const projects = args.projects ? await readTabularFile(args.projects, args.projectsSheet) : [];
  return { clients, contacts, projects };
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (process.env[key]) continue;
    process.env[key] = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
  }
}

function parseArgs(argv) {
  const args = {
    apply: false,
    clients: "",
    contacts: "",
    projects: "",
    clientsSheet: "",
    contactsSheet: "",
    projectsSheet: "",
    out: "",
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--clients") args.clients = argv[++i] || "";
    else if (arg === "--contacts") args.contacts = argv[++i] || "";
    else if (arg === "--projects") args.projects = argv[++i] || "";
    else if (arg === "--clients-sheet") args.clientsSheet = argv[++i] || "";
    else if (arg === "--contacts-sheet") args.contactsSheet = argv[++i] || "";
    else if (arg === "--projects-sheet") args.projectsSheet = argv[++i] || "";
    else if (arg === "--out") args.out = argv[++i] || "";
    else throw new Error(`Unknown option: ${arg}`);
  }

  return args;
}

function usage() {
  return `
Legacy import preview/apply

Dry run:
  node scripts/import-legacy-data.mjs --clients old-clients.csv --contacts old-contacts.xlsx --projects old-projects.csv

Apply after reviewing the report:
  node scripts/import-legacy-data.mjs --clients old-clients.csv --contacts old-contacts.xlsx --projects old-projects.csv --apply

Options:
  --clients <file>          CSV, TSV, or XLSX clients file
  --contacts <file>         CSV, TSV, or XLSX contacts file
  --projects <file>         CSV, TSV, or XLSX projects file
  --clients-sheet <name>    Worksheet name when using XLSX
  --contacts-sheet <name>   Worksheet name when using XLSX
  --projects-sheet <name>   Worksheet name when using XLSX
  --out <path>              Report path base, .md, or .json
  --apply                   Actually insert records; omitted means dry-run only
`;
}

function resolveReportBase(outArg) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  const out = outArg || path.join("import-reports", `legacy-import-${stamp}`);
  const parsed = path.parse(out);
  if (parsed.ext === ".md" || parsed.ext === ".json") {
    return path.join(parsed.dir, parsed.name);
  }
  return out;
}

function formatList(items, formatter, empty = "None") {
  if (!items.length) return `- ${empty}\n`;
  return items.map(formatter).join("");
}

export function buildMarkdownReport(plan) {
  const lines = [];
  lines.push("# Legacy Import Report\n");
  lines.push(`Generated: ${plan.generatedAt}\n`);
  lines.push(`Mode: ${plan.mode === "apply" ? "Applied" : "Dry run only"}\n\n`);
  lines.push("## Summary\n");
  lines.push(`- Clients to create: ${plan.summary.clientsToCreate}\n`);
  lines.push(`- Contacts to create: ${plan.summary.contactsToCreate}\n`);
  lines.push(`- Projects to create: ${plan.summary.projectsToCreate}\n`);
  lines.push(`- Skipped existing/duplicate records: ${plan.summary.clientsSkipped + plan.summary.contactsSkipped + plan.summary.projectsSkipped}\n`);
  lines.push(`- Issues to review: ${plan.summary.issues}\n`);
  lines.push(`- Project counter update: ${plan.counterUpdate ? `${plan.counterUpdate.year}: ${plan.counterUpdate.from} -> ${plan.counterUpdate.to}` : "none"}\n\n`);

  lines.push("## New Clients\n");
  lines.push(formatList(plan.creates.clients, item => `- ${item.companyName} (${item.source})\n`));
  lines.push("\n## New Contacts\n");
  lines.push(formatList(plan.creates.contacts, item => `- ${item.name} / ${item.companyName}${item.email ? ` / ${item.email}` : ""} (${item.source})\n`));
  lines.push("\n## New Projects\n");
  lines.push(formatList(plan.creates.projects, item => `- ${item.projectNumber} / ${item.name}${item.companyName ? ` / ${item.companyName}` : ""} (${item.source})\n`));
  lines.push("\n## Skipped\n");
  lines.push(formatList(plan.skipped.clients, item => `- Client: ${item.companyName} - ${item.reason} (${item.source})\n`));
  lines.push(formatList(plan.skipped.contacts, item => `- Contact: ${item.name} / ${item.companyName} - ${item.reason} (${item.source})\n`));
  lines.push(formatList(plan.skipped.projects, item => `- Project: ${item.projectNumber} - ${item.reason} (${item.source})\n`));
  lines.push("\n## Issues\n");
  lines.push(formatList(plan.issues, item => `- ${item.type}: ${item.message}${item.source ? ` (${item.source})` : ""}\n`, "No issues found"));

  if (plan.mode !== "apply") {
    lines.push("\nThis was a dry run. No database records were changed.\n");
  }

  return lines.join("");
}

async function writeReports(plan, outArg) {
  const base = resolveReportBase(outArg);
  const dir = path.dirname(base);
  fs.mkdirSync(dir, { recursive: true });
  const jsonPath = `${base}.json`;
  const markdownPath = `${base}.md`;
  fs.writeFileSync(jsonPath, `${JSON.stringify(plan, null, 2)}\n`);
  fs.writeFileSync(markdownPath, buildMarkdownReport(plan));
  return { jsonPath, markdownPath };
}

async function applyImportPlan(supabase, plan) {
  const clientIdByRef = new Map();

  for (const contact of plan.creates.contacts) {
    if (contact.existingClientId) clientIdByRef.set(contact.existingClientId, contact.existingClientId);
  }
  for (const project of plan.creates.projects) {
    if (project.existingClientId) clientIdByRef.set(project.existingClientId, project.existingClientId);
  }

  for (const client of plan.creates.clients) {
    const { data, error } = await supabase.from("clients").insert({
      company_name: client.companyName,
      address: client.address,
      industry_type: client.industryType,
      notes: client.notes,
      phone: client.phone,
      fax: client.fax,
      website: client.website,
    }).select().single();
    if (error) throw error;
    client.createdId = data.id;
    clientIdByRef.set(client.clientRef, data.id);
  }

  for (const contact of plan.creates.contacts) {
    const clientId = contact.existingClientId || clientIdByRef.get(contact.clientRef);
    if (!clientId) throw new Error(`Could not resolve client for contact ${contact.name}`);
    const { data, error } = await supabase.from("contacts").insert({
      client_id: clientId,
      name: contact.name,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      mobile_phone: contact.mobilePhone,
      secondary_email: contact.secondaryEmail,
    }).select().single();
    if (error) throw error;
    contact.createdId = data.id;
  }

  for (const project of plan.creates.projects) {
    const clientId = project.existingClientId || (project.clientRef ? clientIdByRef.get(project.clientRef) : null);
    const { data, error } = await supabase.from("projects").insert({
      project_number: project.projectNumber,
      name: project.name,
      description: project.description,
      client_id: clientId || null,
      contact_id: null,
      location: project.location,
      assigned_to: project.assignedTo,
      notes: project.notes,
      status: project.status,
      parent_project_id: project.parentProjectId,
    }).select().single();
    if (error) throw error;
    project.createdId = data.id;

    const { error: activityError } = await supabase.from("activity_log").insert({
      project_id: data.id,
      project_number: project.projectNumber,
      previous_status: null,
      new_status: project.status,
      note: "Project imported from legacy data",
      invoice_id: null,
      invoice_number: null,
      is_invoice_event: false,
    });
    if (activityError) throw activityError;
  }

  if (plan.counterUpdate) {
    const { error } = await supabase.from("project_counter").upsert({
      year: plan.counterUpdate.year,
      counter: plan.counterUpdate.to,
    }, { onConflict: "year" });
    if (error) throw error;
  }

  plan.mode = "apply";
  plan.appliedAt = new Date().toISOString();
  return plan;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!args.clients && !args.contacts && !args.projects) {
    throw new Error("Provide at least one of --clients, --contacts, or --projects.");
  }

  loadEnvFile(path.resolve(".env.local"));
  loadEnvFile(path.resolve(".env"));

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Set SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL/SUPABASE_URL before running the import.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const [source, existing] = await Promise.all([loadSourceData(args), loadExistingData(supabase)]);
  let plan = buildImportPlan({
    clients: source.clients,
    contacts: source.contacts,
    projects: source.projects,
    existingClients: existing.clients,
    existingContacts: existing.contacts,
    existingProjects: existing.projects,
    existingProjectCounter: existing.projectCounter,
  });

  if (args.apply) {
    plan = await applyImportPlan(supabase, plan);
  }

  const reports = await writeReports(plan, args.out);
  console.log(`${args.apply ? "Import complete" : "Dry run complete"}.`);
  console.log(`Markdown report: ${reports.markdownPath}`);
  console.log(`JSON report: ${reports.jsonPath}`);
  if (!args.apply) console.log("No database changes were made. Add --apply after reviewing the report.");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
