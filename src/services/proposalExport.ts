import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  Header,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  PageBreak,
  TabStopType,
  TabStopPosition,
} from "docx";
import { saveAs } from "file-saver";
import type { Proposal, ProposalFeeItem, ProposalClauseSelection, AIContentBlock } from "@/types/proposal";
import type { ProposalClause } from "@/types/proposal";
import type { Project, Contact } from "@/types";

interface ExportData {
  proposal: Partial<Proposal>;
  clientName: string;
  clientAddress: string;
  project?: Project;
  clauses: ProposalClause[];
  contacts: Contact[];
}

const FONT = "Times New Roman";
const BRAND_FONT = "Final Frontier";
const PAGE_WIDTH = 12240;
const PAGE_HEIGHT = 15840;
const MARGIN = 1440;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const EDI_GREEN = "4A7C59";
const TABLE_GREEN = "C5E0B4";

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function text(t: string, opts: any = {}): TextRun {
  return new TextRun({ text: t, font: FONT, size: opts.size || 22, ...opts });
}

function para(children: TextRun[], opts: any = {}): Paragraph {
  return new Paragraph({ children, spacing: { after: 120 }, ...opts });
}

function emptyLine(): Paragraph {
  return new Paragraph({ children: [text("")], spacing: { after: 120 } });
}

async function loadImage(path: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(path);
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch {
    return null;
  }
}

const HEADER_GREEN = "375623"; // Green, Accent 6, Darker 50%
const CONSULTANT_GREEN = "375F1F"; // Dark Green, Accent 3, Darker 50%

function buildEdiHeader(_showContact = false): Header {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: "EDI",
            font: BRAND_FONT,
            italics: true,
            size: 52, // 26pt
            color: HEADER_GREEN,
          }),
        ],
        spacing: { after: 0 },
      }),
    ],
  });
}

/** Final Frontier italic "EDI" run at body size (12pt) */
function ediRun(size = 24): TextRun {
  return new TextRun({ text: "EDI", font: BRAND_FONT, italics: true, size });
}

/**
 * Split a string containing "EDI" into multiple runs so every "EDI"
 * is rendered in Final Frontier italic at the given size, and the
 * surrounding text uses the normal TNR style.
 */
function ediText(input: string, opts: any = {}): TextRun[] {
  const size = opts.size || 24;
  const parts = input.split(/(EDI)/g);
  const runs: TextRun[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (part === "EDI") {
      runs.push(new TextRun({ text: "EDI", font: BRAND_FONT, italics: true, size, color: opts.color }));
    } else {
      runs.push(new TextRun({ text: part, font: FONT, size, ...opts }));
    }
  }
  return runs;
}

function buildCoverPage(data: ExportData, logoData: Uint8Array | null): any {
  const p = data.proposal;
  const projectNumber = data.project?.projectNumber || "";
  const children: (Paragraph | Table)[] = [];

  // Header: left-aligned title + green italic company name + rule
  children.push(para([text("Environmental Services Proposal", { bold: true, size: 44 })], { spacing: { after: 0 } }));
  children.push(para([new TextRun({ text: "Environmental Design Inc.", font: BRAND_FONT, italics: true, size: 28, color: EDI_GREEN })], {
    spacing: { after: 100 },
  }));

  // Spacer (reduced to prevent bottom logo/contact from bleeding to next page)
  children.push(emptyLine());

  // Service type - centered, bold, small caps (NO underline per guide)
  children.push(para([text(p.serviceType || "[SERVICE TYPE]", { bold: true, size: 56, smallCaps: true })], {
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }));
  if (p.secondaryServiceType) {
    children.push(para([text(p.secondaryServiceType, { size: 40, smallCaps: true })], {
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }));
  }

  children.push(para([text("AT", { size: 40 })], { alignment: AlignmentType.CENTER }));

  // Site info - centered, bold, small caps
  children.push(para([text(p.siteName || "[SITE NAME]", { bold: true, size: 44, smallCaps: true })], { alignment: AlignmentType.CENTER, spacing: { after: 0 } }));
  if (p.buildingArea) {
    children.push(para([text(p.buildingArea, { bold: true, size: 44, smallCaps: true })], { alignment: AlignmentType.CENTER, spacing: { after: 0 } }));
  }
  children.push(para([text(p.siteAddress || "[SITE ADDRESS]", { size: 40, smallCaps: true })], { alignment: AlignmentType.CENTER, spacing: { after: 0 } }));
  if (p.siteAddressLine2) {
    children.push(para([text(p.siteAddressLine2, { size: 40, smallCaps: true })], { alignment: AlignmentType.CENTER }));
  }
  children.push(emptyLine());

  // Client info
  children.push(para([text("For the Client", { size: 40, smallCaps: true })], { alignment: AlignmentType.CENTER }));
  children.push(para([text(data.clientName || "[CLIENT NAME]", { bold: true, size: 40, smallCaps: true })], { alignment: AlignmentType.CENTER, spacing: { after: 0 } }));
  
  // Split client address into multiple lines
  const clientAddressLines = (data.clientAddress || "").split("\n").filter(Boolean);
  if (clientAddressLines.length > 0) {
    clientAddressLines.forEach(line => {
      children.push(para([text(line, { size: 40, smallCaps: true })], { alignment: AlignmentType.CENTER, spacing: { after: 0 } }));
    });
  } else {
    children.push(para([text("[CLIENT ADDRESS]", { size: 40, smallCaps: true })], { alignment: AlignmentType.CENTER }));
  }
  children.push(emptyLine());

  // Project # — "EDI" in Final Frontier italic, rest in TNR
  children.push(para([
    new TextRun({ text: "EDI ", font: BRAND_FONT, italics: true, size: 32 }),
    text(`Project # ${projectNumber || "[PROJECT #]"}`, { size: 32 }),
  ], { alignment: AlignmentType.CENTER }));

  // Spacers before bottom
  for (let i = 0; i < 3; i++) children.push(emptyLine());

  // Bottom section: 2-column borderless table — left: date + company info, right: logo
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
  const leftColWidth = Math.round(CONTENT_WIDTH * 0.65);
  const rightColWidth = CONTENT_WIDTH - leftColWidth;

  const leftCellChildren: Paragraph[] = [
    para([text(p.proposalDate || "[DATE]", { size: 32 })], { spacing: { after: 960 } }),
    para([new TextRun({ text: "Environmental Design Inc.", font: BRAND_FONT, size: 32, color: EDI_GREEN })], { spacing: { after: 0 } }),
    para([text("5434 King Avenue, Suite 101", { size: 24 })], { spacing: { after: 0 } }),
    para([text("Pennsauken, New Jersey 08109", { size: 24 })], { spacing: { after: 0 } }),
    para([text("Phone: 1-888-306-4545", { size: 24 })], { spacing: { after: 0 } }),
    para([text("www.editesting.com", { size: 24 })], { spacing: { after: 0 } }),
  ];

  const rightCellChildren: Paragraph[] = [];
  if (logoData) {
    rightCellChildren.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new ImageRun({
          type: "png",
          data: logoData,
          transformation: { width: 187, height: 219 },
          altText: { title: "EDI Logo", description: "Environmental Design Inc. Globe Logo", name: "EDI Logo" },
        }),
      ],
    }));
  } else {
    rightCellChildren.push(para([text("")]));
  }

  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [leftColWidth, rightColWidth],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorders,
            width: { size: leftColWidth, type: WidthType.DXA },
            children: leftCellChildren,
          }),
          new TableCell({
            borders: noBorders,
            width: { size: rightColWidth, type: WidthType.DXA },
            verticalAlign: "bottom" as any,
            children: rightCellChildren,
          }),
        ],
      }),
    ],
  }));

  const pageBorder = { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 24 };
  return {
    properties: {
      page: {
        size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        borders: {
          pageBorderTop: pageBorder,
          pageBorderRight: pageBorder,
          pageBorderBottom: pageBorder,
          pageBorderLeft: pageBorder,
          pageBorders: { offsetFrom: "page" as any, display: "allPages" as any, zOrder: "front" as any },
        },
      },
    },
    children,
  };
}

function buildDetailsPage(data: ExportData): any {
  const p = data.proposal;
  const contact = data.contacts.find(c => c.id === p.proposalDetails?.contactId);
  const projectNumber = data.project?.projectNumber || "";
  const children: (Paragraph | Table)[] = [];

  children.push(para([text("Proposal", { bold: true, size: 40 })], { alignment: AlignmentType.LEFT, spacing: { after: 200 } }));
  children.push(para([text(p.proposalDate || "[DATE]", { size: 24 })], { spacing: { after: 300 } }));

  // Two-column layout using tab stops
  const tabIndent = 2880; // ~2 inches

  // Between the Client
  const clientLines: string[] = [];
  if (contact) {
    clientLines.push(contact.name);
    if (contact.title) clientLines.push(contact.title);
  }
  clientLines.push(data.clientName || "[Client Name]");
  if (data.clientAddress) clientLines.push(...data.clientAddress.split("\n"));

  children.push(para([
    text("Between the Client:", { size: 24 }),
    text(`\t${clientLines[0] || ""}`, { size: 24 }),
  ], {
    tabStops: [{ type: TabStopType.LEFT, position: tabIndent }],
    spacing: { after: 0 },
  }));
  for (let i = 1; i < clientLines.length; i++) {
    children.push(para([text(`\t${clientLines[i]}`, { size: 24 })], {
      tabStops: [{ type: TabStopType.LEFT, position: tabIndent }],
      spacing: { after: 0 },
    }));
  }
  children.push(emptyLine());

  // And the Consultant — "Environmental Design Inc." in Final Frontier italic green
  children.push(para([
    text("And the Consultant:", { size: 24 }),
    new TextRun({ text: "\tEnvironmental Design Inc.", font: BRAND_FONT, italics: true, size: 24, color: CONSULTANT_GREEN }),
  ], {
    tabStops: [{ type: TabStopType.LEFT, position: tabIndent }],
    spacing: { after: 0 },
  }));
  children.push(para([text("\t5434 King Avenue, Suite 101", { size: 24 })], {
    tabStops: [{ type: TabStopType.LEFT, position: tabIndent }],
    spacing: { after: 0 },
  }));
  children.push(para([text("\tPennsauken, New Jersey 08109", { size: 24 })], {
    tabStops: [{ type: TabStopType.LEFT, position: tabIndent }],
  }));
  children.push(emptyLine());

  // For the Project
  children.push(para([
    text("For the Project:", { size: 24 }),
    text(`\t${p.serviceType || "[Service Type]"}`, { size: 24 }),
  ], {
    tabStops: [{ type: TabStopType.LEFT, position: tabIndent }],
    spacing: { after: 0 },
  }));
  children.push(para([text(`\t${p.siteName || "[Site Name]"}${p.buildingArea ? ` - ${p.buildingArea}` : ""}`, { size: 24 })], {
    tabStops: [{ type: TabStopType.LEFT, position: tabIndent }],
    spacing: { after: 0 },
  }));
  children.push(para([
    text("\t", { size: 24 }),
    ediRun(24),
    text(` Project # ${projectNumber || "[PROJECT #]"}`, { size: 24 }),
  ], {
    tabStops: [{ type: TabStopType.LEFT, position: tabIndent }],
    spacing: { after: 400 },
  }));

  // Background & Scope
  const background = (p.background as AIContentBlock) || { text: "" };
  const scope = (p.scope as AIContentBlock) || { text: "" };

  children.push(para([text("Background & Scope of Work", { bold: true, size: 24 })], { spacing: { before: 200, after: 200 } }));

  if (background.text) {
    background.text.split("\n").forEach(line => {
      children.push(para([text(line, { size: 24 })], { alignment: AlignmentType.JUSTIFIED, spacing: { after: 100 } }));
    });
  }

  if (scope.text) {
    children.push(emptyLine());
    scope.text.split("\n").forEach(line => {
      children.push(para([text(line, { size: 24 })], { alignment: AlignmentType.JUSTIFIED, spacing: { after: 100 } }));
    });
  }

  const pageBorder = { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 24 };
  return {
    properties: {
      page: {
        size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN, header: 720, footer: 432 },
        borders: {
          pageBorderTop: pageBorder,
          pageBorderRight: pageBorder,
          pageBorderBottom: pageBorder,
          pageBorderLeft: pageBorder,
          pageBorders: { offsetFrom: "page" as any, display: "allPages" as any, zOrder: "front" as any },
        },
      },
    },
    headers: { default: buildEdiHeader() },
    children,
  };
}

function buildFeeSchedulePage(data: ExportData): (Paragraph | Table)[] {
  const p = data.proposal;
  const feeItems = (p.feeItems || []) as ProposalFeeItem[];
  const projectNumber = data.project?.projectNumber || "";
  const feeTotal = feeItems.reduce((sum, item) => sum + (item.displayAmount || 0), 0);
  const children: (Paragraph | Table)[] = [];

  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(para([text("Fee Schedule", { bold: true, size: 24 })], { spacing: { after: 100 } }));
  children.push(para([text(p.serviceType || "[Service Type]", { size: 22 })], { spacing: { after: 0 } }));
  children.push(para([text(`${p.siteName || "[Site Name]"}${p.buildingArea ? ` - ${p.buildingArea}` : ""}`, { size: 22 })], { spacing: { after: 0 } }));
  children.push(para([
    ediRun(22),
    text(` Project # ${projectNumber || "[PROJECT #]"}`, { size: 22 }),
  ], { spacing: { after: 300 } }));

  if (feeItems.length > 0) {
    const colWidths = [1400, 4160, 800, 1200, 1800];
    const greenShading = { fill: TABLE_GREEN, type: ShadingType.CLEAR, color: "auto" };
    const cellMargins = { top: 60, bottom: 60, left: 80, right: 80 };

    const headerRow = new TableRow({
      children: [
        new TableCell({ borders: cellBorders, width: { size: colWidths[0], type: WidthType.DXA }, shading: greenShading, margins: cellMargins, children: [para([text("Item", { bold: true, size: 20 })])] }),
        new TableCell({ borders: cellBorders, width: { size: colWidths[1], type: WidthType.DXA }, shading: greenShading, margins: cellMargins, children: [para([text("Description", { bold: true, size: 20 })])] }),
        new TableCell({ borders: cellBorders, width: { size: colWidths[2], type: WidthType.DXA }, shading: greenShading, margins: cellMargins, children: [para([text("Qty", { bold: true, size: 20 })], { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders, width: { size: colWidths[3], type: WidthType.DXA }, shading: greenShading, margins: cellMargins, children: [para([text("Rate", { bold: true, size: 20 })], { alignment: AlignmentType.RIGHT })] }),
        new TableCell({ borders: cellBorders, width: { size: colWidths[4], type: WidthType.DXA }, shading: greenShading, margins: cellMargins, children: [para([text("Amount", { bold: true, size: 20 })], { alignment: AlignmentType.RIGHT })] }),
      ],
    });

    const dataRows = feeItems.map(item =>
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, width: { size: colWidths[0], type: WidthType.DXA }, margins: cellMargins, verticalAlign: "top" as any, children: [para([text(item.displayItem, { size: 20 })])] }),
          new TableCell({ borders: cellBorders, width: { size: colWidths[1], type: WidthType.DXA }, margins: cellMargins, verticalAlign: "top" as any, children: [para([text(item.displayDescription, { size: 20 })], { alignment: AlignmentType.JUSTIFIED })] }),
          new TableCell({ borders: cellBorders, width: { size: colWidths[2], type: WidthType.DXA }, margins: cellMargins, children: [para([text(String(item.displayQty), { size: 20 })], { alignment: AlignmentType.CENTER })] }),
          new TableCell({ borders: cellBorders, width: { size: colWidths[3], type: WidthType.DXA }, margins: cellMargins, children: [para([text(`$${item.displayRate.toLocaleString()}`, { size: 20 })], { alignment: AlignmentType.RIGHT })] }),
          new TableCell({ borders: cellBorders, width: { size: colWidths[4], type: WidthType.DXA }, margins: cellMargins, children: [para([text(`$${item.displayAmount.toLocaleString()}`, { size: 20 })], { alignment: AlignmentType.RIGHT })] }),
        ],
      })
    );

    const totalRow = new TableRow({
      children: [
        new TableCell({ borders: cellBorders, width: { size: colWidths[0], type: WidthType.DXA }, shading: greenShading, margins: cellMargins, columnSpan: 3, children: [para([text("", { size: 20 })])] }),
        new TableCell({ borders: cellBorders, width: { size: colWidths[3], type: WidthType.DXA }, shading: greenShading, margins: cellMargins, children: [para([text("Total", { bold: true, size: 22 })], { alignment: AlignmentType.RIGHT })] }),
        new TableCell({ borders: cellBorders, width: { size: colWidths[4], type: WidthType.DXA }, shading: greenShading, margins: cellMargins, children: [para([text(`$${feeTotal.toLocaleString()}`, { bold: true, size: 22 })], { alignment: AlignmentType.RIGHT })] }),
      ],
    });

    children.push(
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: colWidths,
        rows: [headerRow, ...dataRows, totalRow],
      })
    );
  }

  return children;
}

/** Replace [variableName] with values, unfilled → [___] */
function substituteVariables(body: string, variables: Record<string, string> = {}): string {
  return body.replace(/\[([a-zA-Z_][a-zA-Z0-9_]*)\]/g, (match, name) => {
    return variables[name] || "[___]";
  });
}

function buildTermsSection(data: ExportData): Paragraph[] {
  const termsSelections = (data.proposal.termsSelections || []) as ProposalClauseSelection[];
  const includedClauses = data.clauses.filter(c =>
    termsSelections.some(s => s.clauseId === c.id && s.included)
  );
  const customInline = termsSelections.filter(s => s.isCustom && s.included && s.customTitle);

  const allBodies: string[] = [];
  includedClauses.forEach(clause => {
    const sel = termsSelections.find(s => s.clauseId === clause.id);
    const body = sel?.editedBody || clause.body;
    allBodies.push(substituteVariables(body, sel?.variables));
  });
  customInline.forEach(s => allBodies.push(s.customBody || ""));

  if (allBodies.length === 0) return [];

  const children: Paragraph[] = [];
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(para([text("Terms and Condition", { bold: true, size: 24 })], { spacing: { before: 200, after: 200 } }));

  allBodies.forEach(body => {
    body.split("\n").forEach(line => {
      children.push(para([text(line, { size: 22 })], { alignment: AlignmentType.JUSTIFIED, spacing: { after: 80 } }));
    });
    children.push(emptyLine());
  });

  return children;
}

function buildAcceptancePage(data: ExportData): Paragraph[] {
  const p = data.proposal;
  const projectNumber = data.project?.projectNumber || "";
  const children: Paragraph[] = [];

  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(para([text("Acceptance of the Proposal", { bold: true, size: 24 })], { spacing: { after: 100 } }));
  children.push(para([text(p.serviceType || "[Service Type]", { size: 22 })], { spacing: { after: 0 } }));
  children.push(para([text(`${p.siteName || "[Site Name]"}${p.buildingArea ? ` - ${p.buildingArea}` : ""}`, { size: 22 })], { spacing: { after: 0 } }));
  children.push(para([
    ediRun(22),
    text(` Project # ${projectNumber || "[PROJECT #]"}`, { size: 22 }),
  ], { spacing: { after: 300 } }));

  children.push(para([text("Acceptance of this proposal is to be made only by an individual authorized by the Client to engage Client financially. EDI considers the authorized signature made on this document to be by such an individual.", { size: 22 })], { alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 } }));
  children.push(para([text("Please make note acceptance of this proposal by signing the original and returning it to us. Please make a copy of this proposal for your records. Thank you.", { size: 22 })], { alignment: AlignmentType.JUSTIFIED, spacing: { after: 600 } }));

  // Company rep signature - horizontal layout with tab stops
  children.push(para([
    text("_".repeat(40), { size: 22 }),
    text("\t_".repeat(1) + "_".repeat(20), { size: 22 }),
  ], {
    tabStops: [{ type: TabStopType.LEFT, position: 6000 }],
    spacing: { after: 0 },
  }));
  children.push(para([
    text(p.companyRepName || "[Company Representative]", { size: 22 }),
    text("\tDated", { size: 22 }),
  ], {
    tabStops: [{ type: TabStopType.LEFT, position: 6000 }],
    spacing: { after: 0 },
  }));
  children.push(para([text(p.companyRepTitle || "[Title]", { size: 20, italics: true })], { spacing: { after: 600 } }));

  // Client rep signature
  children.push(para([
    text("_".repeat(40), { size: 22 }),
    text("\t_".repeat(1) + "_".repeat(20), { size: 22 }),
  ], {
    tabStops: [{ type: TabStopType.LEFT, position: 6000 }],
    spacing: { after: 0 },
  }));
  children.push(para([
    text("Client Authorized Representative", { size: 22 }),
    text("\tDated", { size: 22 }),
  ], {
    tabStops: [{ type: TabStopType.LEFT, position: 6000 }],
  }));
  if (p.clientSignerName) {
    children.push(para([text(`${p.clientSignerName}${p.clientSignerTitle ? `, ${p.clientSignerTitle}` : ""}`, { size: 20, italics: true })]));
  }

  return children;
}

export async function exportProposalDocx(data: ExportData): Promise<void> {
  const logoData = await loadImage("/images/edi-globe-logo.png");

  const coverSection = buildCoverPage(data, logoData);
  const detailsSection = buildDetailsPage(data);

  const feeChildren = buildFeeSchedulePage(data);
  const termsChildren = buildTermsSection(data);
  const acceptanceChildren = buildAcceptancePage(data);

  detailsSection.children.push(...feeChildren, ...termsChildren, ...acceptanceChildren);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 22 },
        },
      },
    },
    sections: [coverSection, detailsSection],
  });

  const buffer = await Packer.toBlob(doc);
  const fileName = `${data.proposal.proposalNumber || "Proposal"}_${data.proposal.siteName || "Draft"}.docx`
    .replace(/[^a-zA-Z0-9_\-. ]/g, "")
    .replace(/\s+/g, "_");
  saveAs(buffer, fileName);
}
