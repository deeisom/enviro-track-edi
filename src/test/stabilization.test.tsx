import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireEdit } from "@/components/AuthGuards";
import { EstimateLinker } from "@/components/proposals/EstimateLinker";
import { FeeScheduleEditor } from "@/components/proposals/FeeScheduleEditor";
import RatesPage from "@/pages/RatesPage";
import { groupInvoicesForDisplay } from "@/pages/InvoicesPage";
import { buildDuplicatedProposalInput } from "@/services/proposalStorage";
import { fetchOptionalImageDataUrl } from "@/services/invoiceExport";
import { invoiceLineItemsToProposalFeeItems } from "@/services/proposalFeeItems";
import { rateItemToInvoiceLineItem } from "@/services/invoiceLineItems";
import { useState } from "react";
import type { Invoice, RateItem } from "@/types/invoice";
import type { Proposal, ProposalFeeItem } from "@/types/proposal";

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

  it("creates invoice rows from rate table item and description fields", () => {
    vi.stubGlobal("crypto", {});

    const rate: RateItem = {
      id: "rate-analytical",
      name: "Mold in Air Samples",
      item: "Analytical",
      itemDescription: "Mold in air samples",
      category: "analytical",
      defaultRate: 70,
      unit: "per sample",
    };

    expect(rateItemToInvoiceLineItem(rate)).toMatchObject({
      rateItemId: "rate-analytical",
      name: "Analytical",
      description: "Mold in air samples",
      qty: 1,
      rate: 70,
      amount: 70,
    });
  });

  it("keeps rate table invoice rows useful when item fields are blank", () => {
    vi.stubGlobal("crypto", {});

    const rate: RateItem = {
      id: "rate-final-report",
      name: "Final Report",
      item: "",
      itemDescription: "",
      category: "services",
      defaultRate: 150,
      unit: "flat",
    };

    expect(rateItemToInvoiceLineItem(rate)).toMatchObject({
      name: "Final Report",
      description: "Final Report",
      rate: 150,
      amount: 150,
    });
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

  it("creates editable proposal fee rows when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {});

    function Harness() {
      const [items, setItems] = useState<ProposalFeeItem[]>([]);
      return <FeeScheduleEditor feeItems={items} onUpdate={setItems} />;
    }

    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: /add item/i }));

    expect(screen.queryByText(/no fee items yet/i)).not.toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("Item")).toHaveLength(1);
  });

  it("converts linked invoice rows with current or legacy field names", () => {
    vi.stubGlobal("crypto", {});

    const feeItems = invoiceLineItemsToProposalFeeItems([
      { id: "current", name: "Final Report", description: "Final Report", qty: 1, rate: 150, amount: 150 },
      { id: "legacy", item: "Analytical", displayDescription: "Mold in air samples", displayQty: 6, displayRate: 70, displayAmount: 420 } as any,
    ]);

    expect(feeItems).toMatchObject([
      { displayItem: "Final Report", displayDescription: "Final Report", displayQty: 1, displayRate: 150, displayAmount: 150 },
      { displayItem: "Analytical", displayDescription: "Mold in air samples", displayQty: 6, displayRate: 70, displayAmount: 420 },
    ]);
  });

  it("keeps blank invoice line items editable in proposal fees", () => {
    vi.stubGlobal("crypto", {});

    const feeItems = invoiceLineItemsToProposalFeeItems([
      { id: "blank", name: "", description: "", qty: 1, rate: 0, amount: 0 },
    ]);

    expect(feeItems).toHaveLength(1);
    expect(feeItems[0]).toMatchObject({ displayItem: "", displayDescription: "", displayQty: 1, displayRate: 0, displayAmount: 0 });
  });

  it("sends the selected invoice id to the proposal builder", async () => {
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    const invoice = makeInvoice("invoice-1", "INV-0001");
    invoice.projectId = "project-1";
    invoice.lineItems = [
      { id: "line-1", name: "Final Report", description: "Final Report", qty: 1, rate: 150, amount: 150 },
    ];
    const onEstimateSelect = vi.fn();

    render(
      <EstimateLinker
        projectId="project-1"
        estimateId={null}
        invoices={[invoice]}
        onEstimateSelect={onEstimateSelect}
      />
    );

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByText("INV-0001"));

    expect(onEstimateSelect).toHaveBeenCalledWith("invoice-1");
  });
});
