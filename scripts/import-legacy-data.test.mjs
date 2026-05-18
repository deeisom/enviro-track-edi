import { describe, expect, it } from "vitest";
import {
  buildImportPlan,
  normalizeCompanyName,
  parseCsv,
  rowsToObjects,
} from "./import-legacy-data.mjs";

describe("legacy import helpers", () => {
  it("normalizes company names for duplicate matching", () => {
    expect(normalizeCompanyName("The Acme Environmental, LLC")).toBe("acmeenvironmental");
    expect(normalizeCompanyName("Acme Environmental Inc.")).toBe("acmeenvironmental");
  });

  it("parses quoted CSV cells with commas and line breaks", () => {
    const rows = rowsToObjects(parseCsv('Company Name,Notes\n"Acme, LLC","Line one\nLine two"\n'));

    expect(rows).toEqual([
      {
        __rowNumber: 2,
        companyname: "Acme, LLC",
        notes: "Line one\nLine two",
      },
    ]);
  });

  it("plans creates, skips duplicates, preserves project numbers, and updates the counter", () => {
    const clients = rowsToObjects(parseCsv([
      "Company Name,Address",
      "Acme LLC,1 Main St",
      "Beta LLC,2 Lake St",
    ].join("\n")));
    const contacts = rowsToObjects(parseCsv([
      "Company,Contact Name,Email,Phone",
      "Acme Inc,John Smith,john@example.com,555-1000",
      "Beta LLC,Jane Doe,jane@example.com,555-2000",
      "Beta LLC,,blank@example.com,555-3000",
    ].join("\n")));
    const projects = rowsToObjects(parseCsv([
      "Project Number,Project Name,Company,Status,Assigned To",
      "EDI-2026-0001,Existing Project,Acme Inc,1.0,Dean",
      "EDI-2026-0007,Imported Project,Beta LLC,Unknown Status,\"Dean, Alex\"",
    ].join("\n")));

    const plan = buildImportPlan({
      clients,
      contacts,
      projects,
      existingClients: [{ id: "client-acme", company_name: "Acme Inc" }],
      existingContacts: [{ id: "contact-john", client_id: "client-acme", name: "John Smith", email: "john@example.com" }],
      existingProjects: [{ id: "project-existing", project_number: "EDI-2026-0001", name: "Existing Project" }],
      existingProjectCounter: 1,
      now: new Date("2026-05-08T12:00:00.000Z"),
    });

    expect(plan.creates.clients).toMatchObject([{ companyName: "Beta LLC" }]);
    expect(plan.creates.contacts).toMatchObject([{ name: "Jane Doe", companyName: "Beta LLC" }]);
    expect(plan.creates.projects).toMatchObject([
      { projectNumber: "EDI-2026-0007", name: "Imported Project", status: "1.0", assignedTo: ["Dean", "Alex"] },
    ]);
    expect(plan.skipped.clients).toHaveLength(1);
    expect(plan.skipped.contacts).toHaveLength(1);
    expect(plan.skipped.projects).toMatchObject([{ projectNumber: "EDI-2026-0001" }]);
    expect(plan.issues.map(issue => issue.type)).toEqual(expect.arrayContaining(["missing_contact_name", "project_status_defaulted"]));
    expect(plan.counterUpdate).toEqual({ year: 2026, from: 1, to: 7 });
  });

  it("treats placeholder client values as unlinked projects in the preview report", () => {
    const projects = rowsToObjects(parseCsv([
      "Project Number,Project Name,Client,Status",
      "PR-240909-1302,River Edge BOE - Mold Testing,—,2.0",
      "PR-240711-1263,River Edge BOE - Gym Floor,â€”,1.0",
      "PR-200812-1578,YMCA IEHA,N/A,4.0",
    ].join("\n")));

    const plan = buildImportPlan({
      projects,
      now: new Date("2026-05-08T12:00:00.000Z"),
    });

    expect(plan.creates.clients).toHaveLength(0);
    expect(plan.creates.projects).toHaveLength(3);
    expect(plan.issues.filter(issue => issue.type === "project_unlinked_client")).toHaveLength(3);
  });
});
