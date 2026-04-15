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

async function loadImage(path: string): Promise<Buffer | null> {
  try {
    const response = await fetch(path);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

function buildEdiHeader(showContact = false): Header {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [text("EDI", { bold: true, italics: true, size: 36, color: EDI_GREEN })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 1 } },
      spacing: { after: 100 },
    }),
  ];
  if (showContact) {
    children.push(
      new Paragraph({
        children: [text("Phone: 1-888-306-4545", { size: 18 })],
        spacing: { after: 0 },
      }),
      new Paragraph({
        children: [text("www.editesting.com", { size: 18 })],
        spacing: { after: 200 },
      })
    );
  }
  return new Header({ children });
}

function buildCoverPage(data: ExportData, logoData: Buffer | null): any {
  const p = data.proposal;
  const projectNumber = data.project?.projectNumber || "";
  const children: Paragraph[] = [];

  // Header: left-aligned title + green italic company name + rule
  children.push(para([text("Environmental Services Proposal", { bold: true, size: 28 })], { spacing: { after: 0 } }));
  children.push(para([text("Environmental Design Inc.", { italics: true, size: 22, color: EDI_GREEN })], {
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 4 } },
    spacing: { after: 400 },
  }));

  // Spacer
  for (let i = 0; i < 3; i++) children.push(emptyLine());

  // Service type - centered, bold, underlined, small caps
  children.push(para([text(p.serviceType || "[SERVICE TYPE]", { bold: true, size: 32, smallCaps: true, underline: { type: "single" } })], {
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));

  children.push(para([text("AT", { size: 22 })], { alignment: AlignmentType.CENTER }));

  // Site info - centered, bold, small caps
  children.push(para([text(p.siteName || "[SITE NAME]", { bold: true, size: 26, smallCaps: true })], { alignment: AlignmentType.CENTER, spacing: { after: 0 } }));
  if (p.buildingArea) {
    children.push(para([text(p.buildingArea, { bold: true, size: 26, smallCaps: true })], { alignment: AlignmentType.CENTER, spacing: { after: 0 } }));
  }
  children.push(para([text(p.siteAddress || "[SITE ADDRESS]", { size: 22, smallCaps: true })], { alignment: AlignmentType.CENTER }));
  children.push(emptyLine());

  // Client info
  children.push(para([text("For the Client", { size: 22, smallCaps: true })], { alignment: AlignmentType.CENTER }));
  children.push(para([text(data.clientName || "[CLIENT NAME]", { bold: true, size: 24, smallCaps: true })], { alignment: AlignmentType.CENTER, spacing: { after: 0 } }));
  children.push(para([text(data.clientAddress || "[CLIENT ADDRESS]", { size: 22, smallCaps: true })], { alignment: AlignmentType.CENTER }));
  children.push(emptyLine());

  // Project #
  children.push(para([text("EDI", { italics: true, size: 22 }), text(` Project # ${projectNumber || "[PROJECT #]"}`, { size: 22 })], { alignment: AlignmentType.CENTER }));

  // Spacers before bottom
  for (let i = 0; i < 4; i++) children.push(emptyLine());

  // Bottom: date on left, company on left, logo on right (use tab stops for positioning)
  children.push(para([text(p.proposalDate || "[DATE]", { size: 22 })], { spacing: { after: 200 } }));

  // Company info in green
  children.push(para([text("Environmental Design Inc.", { italics: true, size: 22, color: EDI_GREEN })], { spacing: { after: 0 } }));
  children.push(para([text("5434 King Avenue, Suite 101", { size: 18 })], { spacing: { after: 0 } }));
  children.push(para([text("Pennsauken, New Jersey 08109", { size: 18 })]));

  // Logo (as separate right-aligned paragraph if available)
  if (logoData) {
    children.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new ImageRun({
          type: "jpg",
          data: logoData,
          transformation: { width: 150, height: 160 },
          altText: { title: "EDI Logo", description: "Environmental Design Inc. Globe Logo", name: "EDI Logo" },
        }),
      ],
    }));
  }

  return {
    properties: {
      page: {
        size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
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

  children.push(para([text("Proposal", { bold: true, size: 28 })], { spacing: { after: 200 } }));
  children.push(para([text(p.proposalDate || "[DATE]", { size: 22 })], { spacing: { after: 300 } }));

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
    text("Between the Client:", { size: 22 }),
    text(`\t${clientLines[0] || ""}`, { size: 22 }),
  ], {
    tabStops: [{ type: TabStopType.LEFT, position: tabIndent }],
    spacing: { after: 0 },
  }));
  for (let i = 1; i < clientLines.length; i++) {
    children.push(para([text(`\t${clientLines[i]}`, { size: 22 })], {
      tabStops: [{ type: TabStopType.LEFT, position: tabIndent }],
      spacing: { after: 0 },
    }));
  }
  children.push(emptyLine());

  // And the Consultant
  children.push(para([
    text("And the Consultant:", { size: 22 }),
    text("\tEnvironmental Design Inc.", { size: 22, italics: true }),
  ], {
    tabStops: [{ type: TabStopType.LEFT, position: tabIndent }],
    spacing: { after: 0 },
  }));
  children.push(para([text("\t5434 King Avenue, Suite 101", { size: 22 })], {
    tabStops: [{ type: TabStopType.LEFT, position: tabIndent }],
    spacing: { after: 0 },
  }));
  children.push(para([text("\tPennsauken, New Jersey 08109", { size: 22 })], {
    tabStops: [{ type: TabStopType.LEFT, position: tabIndent }],
  }));
  children.push(emptyLine());

  // For the Project
  children.push(para([
    text("For the Project:", { size: 22 }),
    text(`\t${p.serviceType || "[Service Type]"}`, { size: 22 }),
  ], {
    tabStops: [{ type: TabStopType.LEFT, position: tabIndent }],
    spacing: { after: 0 },
  }));
  children.push(para([text(`\t${p.siteName || "[Site Name]"}${p.buildingArea ? ` - ${p.buildingArea}` : ""}`, { size: 22 })], {
    tabStops: [{ type: TabStopType.LEFT, position: tabIndent }],
    spacing: { after: 0 },
  }));
  children.push(para([
    text("\t", { size: 22 }),
    text("EDI", { size: 22, italics: true }),
    text(` Project # ${projectNumber || "[PROJECT #]"}`, { size: 22 }),
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
      children.push(para([text(line, { size: 22 })], { alignment: AlignmentType.JUSTIFIED, spacing: { after: 100 } }));
    });
  }

  if (scope.text) {
    children.push(emptyLine());
    scope.text.split("\n").forEach(line => {
      children.push(para([text(line, { size: 22 })], { alignment: AlignmentType.JUSTIFIED, spacing: { after: 100 } }));
    });
  }

  return {
    properties: {
      page: {
        size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
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
    text("EDI", { size: 22, italics: true }),
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
    text("EDI", { size: 22, italics: true }),
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
  const logoData = await loadImage("/images/edi-globe-logo.jpg");

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
