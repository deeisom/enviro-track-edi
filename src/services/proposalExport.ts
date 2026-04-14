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
  Footer,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  PageBreak,
  PageNumber,
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
const PAGE_WIDTH = 12240; // US Letter
const PAGE_HEIGHT = 15840;
const MARGIN = 1440; // 1 inch
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 9360

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
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

async function loadLogo(): Promise<Buffer | null> {
  try {
    const response = await fetch("/images/edi-logo.jpg");
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

function buildHeader(): Header {
  return new Header({
    children: [
      new Paragraph({
        children: [
          text("EDI", { bold: true, size: 28 }),
          text("\tPhone: 1-888-306-4545 | www.editesting.com", { size: 16 }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } },
        spacing: { after: 200 },
      }),
    ],
  });
}

function buildFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          text("Environmental Design Inc. | 5434 King Avenue, Suite 101 | Pennsauken, NJ 08109", { size: 16, italics: true }),
        ],
      }),
    ],
  });
}

function buildCoverPage(data: ExportData, logoData: Buffer | null): any {
  const p = data.proposal;
  const children: Paragraph[] = [];

  // Spacer
  for (let i = 0; i < 6; i++) children.push(emptyLine());

  if (logoData) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            type: "jpg",
            data: logoData,
            transformation: { width: 200, height: 100 },
            altText: { title: "EDI Logo", description: "Environmental Design Inc. Logo", name: "EDI Logo" },
          }),
        ],
      })
    );
    children.push(emptyLine());
  }

  children.push(para([text("Environmental Services Proposal", { bold: true, size: 28 })], { alignment: AlignmentType.CENTER }));
  children.push(para([text("Environmental Design Inc.", { italics: true, size: 22 })], { alignment: AlignmentType.CENTER }));
  children.push(emptyLine());

  children.push(para([text(p.serviceType || "[SERVICE TYPE]", { bold: true, size: 24, allCaps: true })], { alignment: AlignmentType.CENTER }));
  children.push(para([text("AT", { size: 22 })], { alignment: AlignmentType.CENTER }));
  children.push(para([text(p.siteName || "[SITE NAME]", { bold: true, size: 24, allCaps: true })], { alignment: AlignmentType.CENTER }));
  if (p.buildingArea) {
    children.push(para([text(p.buildingArea, { bold: true, size: 22, allCaps: true })], { alignment: AlignmentType.CENTER }));
  }
  children.push(para([text(p.siteAddress || "[SITE ADDRESS]", { size: 22 })], { alignment: AlignmentType.CENTER }));
  children.push(emptyLine());

  children.push(para([text("FOR THE CLIENT", { size: 20 })], { alignment: AlignmentType.CENTER }));
  children.push(para([text(data.clientName || "[CLIENT NAME]", { bold: true, size: 24, allCaps: true })], { alignment: AlignmentType.CENTER }));
  children.push(para([text(data.clientAddress || "[CLIENT ADDRESS]", { size: 22 })], { alignment: AlignmentType.CENTER }));
  children.push(emptyLine());

  const projectNumber = data.project?.projectNumber || "";
  children.push(para([text(`EDI Project # ${projectNumber || "[PROJECT #]"}`, { italics: true, size: 22 })], { alignment: AlignmentType.CENTER }));
  children.push(para([text(p.proposalDate || "[DATE]", { size: 22 })], { alignment: AlignmentType.CENTER }));

  // Footer on cover
  for (let i = 0; i < 4; i++) children.push(emptyLine());
  children.push(para([text("Environmental Design Inc.", { italics: true, size: 18 })], { alignment: AlignmentType.CENTER }));
  children.push(para([text("5434 King Avenue, Suite 101", { size: 18 })], { alignment: AlignmentType.CENTER }));
  children.push(para([text("Pennsauken, New Jersey 08109", { size: 18 })], { alignment: AlignmentType.CENTER }));

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
  const children: Paragraph[] = [];

  children.push(para([text("Proposal", { bold: true, size: 28 })], { alignment: AlignmentType.CENTER, spacing: { after: 300 } }));
  children.push(para([text(p.proposalDate || "[DATE]", { size: 22 })], { spacing: { after: 300 } }));

  // Between the Client
  children.push(para([text("Between the Client:", { bold: true, size: 22 })], { spacing: { after: 60 } }));
  if (contact) {
    children.push(para([text(contact.name, { size: 22 })], { indent: { left: 720 } }));
    if (contact.title) children.push(para([text(contact.title, { size: 22 })], { indent: { left: 720 } }));
  }
  children.push(para([text(data.clientName || "[Client Name]", { size: 22 })], { indent: { left: 720 } }));
  children.push(para([text(data.clientAddress || "[Client Address]", { size: 22 })], { indent: { left: 720 }, spacing: { after: 300 } }));

  // And the Consultant
  children.push(para([text("And the Consultant:", { bold: true, size: 22 })], { spacing: { after: 60 } }));
  children.push(para([text("Environmental Design Inc.", { italics: true, size: 22 })], { indent: { left: 720 } }));
  children.push(para([text("5434 King Avenue, Suite 101", { size: 22 })], { indent: { left: 720 } }));
  children.push(para([text("Pennsauken, New Jersey 08109", { size: 22 })], { indent: { left: 720 }, spacing: { after: 300 } }));

  // For the Project
  children.push(para([text("For the Project:", { bold: true, size: 22 })], { spacing: { after: 60 } }));
  children.push(para([text(p.serviceType || "[Service Type]", { size: 22 })], { indent: { left: 720 } }));
  children.push(para([text(`${p.siteName || "[Site Name]"}${p.buildingArea ? ` - ${p.buildingArea}` : ""}`, { size: 22 })], { indent: { left: 720 } }));
  children.push(para([text(`EDI Project # ${projectNumber || "[PROJECT #]"}`, { italics: true, size: 22 })], { indent: { left: 720 }, spacing: { after: 400 } }));

  // Background & Scope
  const background = (p.background as AIContentBlock) || { text: "" };
  const scope = (p.scope as AIContentBlock) || { text: "" };

  children.push(para([text("Background & Scope of Work", { bold: true, size: 24 })], { spacing: { before: 200, after: 200 } }));

  if (background.text) {
    background.text.split("\n").forEach(line => {
      children.push(para([text(line, { size: 22 })], { spacing: { after: 100 } }));
    });
  }

  if (scope.text) {
    children.push(emptyLine());
    scope.text.split("\n").forEach(line => {
      children.push(para([text(line, { size: 22 })], { spacing: { after: 100 } }));
    });
  }

  return {
    properties: {
      page: {
        size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
    },
    headers: { default: buildHeader() },
    footers: { default: buildFooter() },
    children,
  };
}

function buildFeeSchedulePage(data: ExportData): any {
  const p = data.proposal;
  const feeItems = (p.feeItems || []) as ProposalFeeItem[];
  const projectNumber = data.project?.projectNumber || "";
  const feeTotal = feeItems.reduce((sum, item) => sum + (item.displayAmount || 0), 0);
  const children: Paragraph[] = [];

  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(para([text("Fee Schedule", { bold: true, size: 24 })], { spacing: { after: 100 } }));
  children.push(para([text(p.serviceType || "[Service Type]", { size: 22 })]));
  children.push(para([text(`${p.siteName || "[Site Name]"}${p.buildingArea ? ` - ${p.buildingArea}` : ""}`, { size: 22 })]));
  children.push(para([text(`EDI Project # ${projectNumber || "[PROJECT #]"}`, { italics: true, size: 22 })], { spacing: { after: 200 } }));

  if (feeItems.length > 0) {
    const colWidths = [1400, 4160, 800, 1200, 1800];
    const headerShading = { fill: "D5E8F0", type: ShadingType.CLEAR, color: "auto" };

    const headerRow = new TableRow({
      children: [
        new TableCell({ borders: cellBorders, width: { size: colWidths[0], type: WidthType.DXA }, shading: headerShading, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [para([text("Item", { bold: true, size: 20 })])] }),
        new TableCell({ borders: cellBorders, width: { size: colWidths[1], type: WidthType.DXA }, shading: headerShading, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [para([text("Description", { bold: true, size: 20 })])] }),
        new TableCell({ borders: cellBorders, width: { size: colWidths[2], type: WidthType.DXA }, shading: headerShading, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [para([text("Qty", { bold: true, size: 20 })], { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders, width: { size: colWidths[3], type: WidthType.DXA }, shading: headerShading, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [para([text("Rate", { bold: true, size: 20 })], { alignment: AlignmentType.RIGHT })] }),
        new TableCell({ borders: cellBorders, width: { size: colWidths[4], type: WidthType.DXA }, shading: headerShading, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [para([text("Amount", { bold: true, size: 20 })], { alignment: AlignmentType.RIGHT })] }),
      ],
    });

    const dataRows = feeItems.map(item =>
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, width: { size: colWidths[0], type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 80, right: 80 }, verticalAlign: "top" as any, children: [para([text(item.displayItem, { size: 20 })])] }),
          new TableCell({ borders: cellBorders, width: { size: colWidths[1], type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 80, right: 80 }, verticalAlign: "top" as any, children: [para([text(item.displayDescription, { size: 20 })])] }),
          new TableCell({ borders: cellBorders, width: { size: colWidths[2], type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 80, right: 80 }, children: [para([text(String(item.displayQty), { size: 20 })], { alignment: AlignmentType.CENTER })] }),
          new TableCell({ borders: cellBorders, width: { size: colWidths[3], type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 80, right: 80 }, children: [para([text(`$${item.displayRate.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, { size: 20 })], { alignment: AlignmentType.RIGHT })] }),
          new TableCell({ borders: cellBorders, width: { size: colWidths[4], type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 80, right: 80 }, children: [para([text(`$${item.displayAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, { size: 20 })], { alignment: AlignmentType.RIGHT })] }),
        ],
      })
    );

    const totalRow = new TableRow({
      children: [
        new TableCell({ borders: cellBorders, width: { size: colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], type: WidthType.DXA }, columnSpan: 4, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [para([text("Total", { bold: true, size: 22 })], { alignment: AlignmentType.RIGHT })] }),
        new TableCell({ borders: cellBorders, width: { size: colWidths[4], type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [para([text(`$${feeTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, { bold: true, size: 22 })], { alignment: AlignmentType.RIGHT })] }),
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

function buildTermsSection(data: ExportData): Paragraph[] {
  const termsSelections = (data.proposal.termsSelections || []) as ProposalClauseSelection[];
  const includedClauses = data.clauses.filter(c =>
    termsSelections.some(s => s.clauseId === c.id && s.included)
  );

  if (includedClauses.length === 0) return [];

  const children: Paragraph[] = [];
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(para([text("Terms and Conditions", { bold: true, size: 24 })], { spacing: { before: 200, after: 200 } }));

  includedClauses.forEach((clause, idx) => {
    const sel = termsSelections.find(s => s.clauseId === clause.id);
    const body = sel?.editedBody || clause.body;
    children.push(para([text(`${idx + 1}. ${clause.title}`, { bold: true, size: 22 })], { spacing: { before: 160, after: 60 } }));
    body.split("\n").forEach(line => {
      children.push(para([text(line, { size: 22 })], { spacing: { after: 80 } }));
    });
  });

  return children;
}

function buildAcceptancePage(data: ExportData): Paragraph[] {
  const p = data.proposal;
  const projectNumber = data.project?.projectNumber || "";
  const children: Paragraph[] = [];

  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(para([text("Acceptance of the Proposal", { bold: true, size: 24 })], { spacing: { after: 100 } }));
  children.push(para([text(p.serviceType || "[Service Type]", { size: 22 })]));
  children.push(para([text(`${p.siteName || "[Site Name]"}${p.buildingArea ? ` - ${p.buildingArea}` : ""}`, { size: 22 })]));
  children.push(para([text(`EDI Project # ${projectNumber || "[PROJECT #]"}`, { italics: true, size: 22 })], { spacing: { after: 300 } }));

  children.push(para([text("Acceptance of this proposal is to be made only by an individual authorized by the Client to engage Client financially. EDI considers the authorized signature made on this document to be by such an individual.", { size: 22 })], { spacing: { after: 200 } }));
  children.push(para([text("Please make note acceptance of this proposal by signing the original and returning it to us. Please make a copy of this proposal for your records. Thank you.", { size: 22 })], { spacing: { after: 600 } }));

  // Company rep signature
  children.push(para([text("_".repeat(50), { size: 22 })]));
  children.push(para([text(p.companyRepName || "[Company Representative]", { size: 22 })]));
  children.push(para([text(p.companyRepTitle || "[Title]", { size: 20, italics: true })], { spacing: { after: 60 } }));
  children.push(para([text("", { size: 22 }), text("\tDated: _________________", { size: 22 })], {
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    spacing: { after: 600 },
  }));

  // Client rep signature
  children.push(para([text("_".repeat(50), { size: 22 })]));
  children.push(para([text("Client Authorized Representative", { size: 22 })]));
  if (p.clientSignerName) {
    children.push(para([text(`${p.clientSignerName}${p.clientSignerTitle ? `, ${p.clientSignerTitle}` : ""}`, { size: 20, italics: true })]));
  }
  children.push(para([text("", { size: 22 }), text("\tDated: _________________", { size: 22 })], {
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
  }));

  return children;
}

export async function exportProposalDocx(data: ExportData): Promise<void> {
  const logoData = await loadLogo();

  const coverSection = buildCoverPage(data, logoData);
  const detailsSection = buildDetailsPage(data);

  // Fee schedule, terms, and acceptance go in the details section (with page breaks)
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
