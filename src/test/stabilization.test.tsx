import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireEdit } from "@/components/AuthGuards";
import RatesPage from "@/pages/RatesPage";
import { groupInvoicesForDisplay } from "@/pages/InvoicesPage";
import { buildDuplicatedProposalInput } from "@/services/proposalStorage";
import { fetchOptionalImageDataUrl } from "@/services/invoiceExport";
import type { Invoice } from "@/types/invoice";
import type { Proposal } from "@/types/proposal";

const authMock = vi.hoisted(() => ({
  state: {
    canEdit: false,
    isAdmin: false,
    user: null,
    session: null,
    loading: false,
    role: "view_only",
    signOut: vi.fn(),
  },
}));

const invoiceStorageMock = vi.hoisted(() => ({
  getAllRates: vi.fn(),
  getAllInvoices: vi.fn(),
  createInvoice: vi.fn(),
  updateInvoice: vi.fn(),
  deleteInvoice: vi.fn(),
  createRate: vi.fn(),
  updateRate: vi.fn(),
  deleteRate: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authMock.state,
}));

vi.mock("@/services/invoiceStorage", () => invoiceStorageMock);

vi.mock("@/services/csvExport", () => ({
  exportToCsv: vi.fn(),
  timestampedFilename: (base: string) => `${base}.csv`,
}));

function makeInvoice(id: string, invoiceNumber: string, parentInvoiceId: string | null = null): Invoice {
  return {
    id,
    invoiceNumber,
    parentInvoiceId,
    type: "invoice",
    projectId: null,
    clientId: null,
    billTo: { name: "Client", address: "" },
    poNumber: "",
    date: "2026-04-30",
    dueDate: "",
    terms: "Net 30",
    projectSummary: "",
    lineItems: [],
    total: 0,
    status: "draft",
    createdAt: "",
    updatedAt: "",
  };
}

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: "proposal-1",
    proposalNumber: "PROP-0001",
    status: "finalized",
    version: 4,
    clientId: "client-1",
    projectId: "project-1",
    estimateId: "estimate-1",
    proposalDate: "April 30, 2026",
    expirationDate: "May 30, 2026",
    serviceType: "Phase I ESA",
    siteName: "Elm Street",
    siteAddress: "123 Elm Street",
    siteAddressLine2: "Suite 2",
    buildingArea: "10,000 SF",
    secondaryServiceType: "Lead",
    companyRepName: "Tim Groman",
    companyRepTitle: "Director",
    clientSignerName: "Client Signer",
    clientSignerTitle: "Owner",
    coverPage: { clientNameOverride: "Client" },
    proposalDetails: { objective: "Testing" },
    background: { text: "AI background", ai_generated: true, locked: false, prompt_inputs: {} },
    scope: { text: "Manual scope", ai_generated: false, locked: false, prompt_inputs: {} },
    feeItems: [],
    termsSelections: [],
    acceptance: {},
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("stabilization permissions", () => {
  beforeEach(() => {
    authMock.state.canEdit = false;
    authMock.state.isAdmin = false;
    authMock.state.role = "view_only";
    invoiceStorageMock.getAllRates.mockResolvedValue([
      { id: "rate-1", name: "Program Admin", item: "Admin", itemDescription: "Coordination", category: "services", defaultRate: 95, unit: "per hour" },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("redirects view-only users away from edit-only routes", async () => {
    render(
      <MemoryRouter initialEntries={["/projects/new"]}>
        <Routes>
          <Route path="/" element={<div>Dashboard</div>} />
          <Route path="/projects/new" element={<RequireEdit><div>Create Project Form</div></RequireEdit>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Create Project Form")).not.toBeInTheDocument();
  });

  it("hides create, edit, and delete controls on rate table for view-only users", async () => {
    render(<RatesPage />);

    expect(await screen.findByText("Program Admin")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add item/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/edit rate/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/delete rate/i)).not.toBeInTheDocument();
    await waitFor(() => expect(invoiceStorageMock.getAllRates).toHaveBeenCalled());
  });
});

describe("stabilization workflow helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("groups invoice continuation pages directly under their parent", () => {
    const parent = makeInvoice("parent", "INV-0001");
    const child2 = makeInvoice("child-2", "INV-0001-02", "parent");
    const orphan = makeInvoice("orphan", "INV-9999-01", "missing-parent");
    const child1 = makeInvoice("child-1", "INV-0001-01", "parent");

    const rows = groupInvoicesForDisplay([child2, parent, orphan, child1]);

    expect(rows.map(row => row.invoice.id)).toEqual(["parent", "child-1", "child-2", "orphan"]);
    expect(rows[0].childCount).toBe(2);
    expect(rows[1]).toMatchObject({ isChild: true, suffix: "-01" });
    expect(rows[3]).toMatchObject({ isChild: false, suffix: "" });
  });

  it("duplicates proposals as a fresh draft and locks copied AI sections", () => {
    const duplicated = buildDuplicatedProposalInput(makeProposal(), "PROP-0002");

    expect(duplicated.proposalNumber).toBe("PROP-0002");
    expect(duplicated.status).toBe("draft");
    expect(duplicated.version).toBe(1);
    expect(duplicated.proposalDate).toBe("");
    expect(duplicated.expirationDate).toBe("");
    expect(duplicated.background?.locked).toBe(true);
    expect(duplicated.scope?.locked).toBe(false);
  });

  it("treats a zero-byte export logo asset as optional", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob([]),
    }));

    await expect(fetchOptionalImageDataUrl("/images/accreditation-logos.png")).resolves.toBeNull();
  });
});
