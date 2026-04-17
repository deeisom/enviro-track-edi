import { Invoice } from "@/types/invoice";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Split an address string into [street, city/state/zip].
 * Handles both newline-separated and single-line addresses.
 */
function splitAddress(address: string): [string, string] {
  // If already has newlines, use them
  if (address.includes("\n")) {
    const parts = address.split("\n").map(s => s.trim()).filter(Boolean);
    return [parts[0] || "", parts.slice(1).join(", ")];
  }
  // Try to split before city/state/zip pattern (e.g. "123 Main St Example City, NJ 08008")
  // Look for the last comma followed by a state abbreviation and zip
  const match = address.match(/^(.+?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)$/);
  if (match) {
    return [match[1], match[2]];
  }
  // Fallback: return whole address on one line
  return [address, ""];
}

/**
 * Excel export: loads the reference invoice template (.xlsx) which already
 * contains the correct layout, logos, borders, and formatting. We only
 * overwrite the dynamic data cells and clear/fill the line-item rows.
 */
/**
 * Render a single invoice's data onto a pre-loaded worksheet that already
 * contains the invoice template layout (logos, borders, formatting).
 */
function renderInvoiceToSheet(ws: ExcelJS.Worksheet, invoice: Invoice) {
  // Print scaling — fit all columns on one page width
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.fitToHeight = 0;

  // Custom print margins (inches)
  ws.pageSetup.margins = {
    top: 0.85,
    left: 0.25,
    right: 0.2,
    bottom: 0,
    header: 0,
    footer: 0,
  };

  // --- Dynamic metadata ---
  // Bill To (A11 = name, A12 = street, A13 = city/state/zip)
  ws.getCell("A11").value = invoice.billTo.name;
  const addrLines = splitAddress(invoice.billTo.address);
  ws.getCell("A12").value = addrLines[0] || "";
  ws.getCell("A13").value = addrLines[1] || "";

  // PO #, Date, Invoice #
  ws.getCell("C13").value = invoice.poNumber;
  ws.getCell("E13").value = invoice.date;
  ws.getCell("F13").value = invoice.invoiceNumber;

  // EDI Project #, Terms, Due Date
  ws.getCell("C15").value = invoice.projectId ? `EDI-${invoice.invoiceNumber}` : "";
  ws.getCell("E15").value = invoice.terms;
  ws.getCell("F15").value = invoice.dueDate;

  // Project Summary (merged A17:F19 in template)
  ws.getCell("A17").value = invoice.projectSummary;

  // --- Line items (dynamic rows starting at 21) ---
  const startRow = 21;
  const templateEndRow = 43;

  // Estimate how many rows a text string needs given approximate char width
  function estimateRows(text: string, charsPerRow: number): number {
    if (!text) return 1;
    return Math.max(1, Math.ceil(text.length / charsPerRow));
  }

  const CHARS_PER_ROW_A = 15;  // Column A width (~15 chars for Calibri 11)
  const CHARS_PER_ROW_BC = 45; // Merged B:C width (~45 chars for Calibri 11)
  const calibriFont: Partial<ExcelJS.Font> = { name: "Calibri", size: 11 };

  // Group consecutive line items by name
  interface LineGroup {
    name: string;
    items: typeof invoice.lineItems;
  }
  const groups: LineGroup[] = [];
  for (const li of invoice.lineItems) {
    const last = groups[groups.length - 1];
    if (last && last.name === li.name) {
      last.items.push(li);
    } else {
      groups.push({ name: li.name, items: [li] });
    }
  }

  // Pre-calculate description row heights for each item
  interface DescHeight { item: typeof invoice.lineItems[0]; rows: number; }
  const groupData: { group: LineGroup; descHeights: DescHeight[]; contentHeight: number; nameRows: number; groupHeight: number; }[] = [];

  for (const group of groups) {
    const descHeights: DescHeight[] = group.items.map(item => ({
      item,
      rows: estimateRows(item.description, CHARS_PER_ROW_BC),
    }));
    // Content height = sum of desc rows + internal separators between descriptions
    const contentHeight = descHeights.reduce((sum, d) => sum + d.rows, 0)
      + (group.items.length > 1 ? group.items.length - 1 : 0);
    const nameRows = estimateRows(group.name, CHARS_PER_ROW_A);
    const groupHeight = Math.max(contentHeight, nameRows);
    groupData.push({ group, descHeights, contentHeight, nameRows, groupHeight });
  }

  // Calculate total rows needed (group heights + inter-group separators)
  let totalRowsNeeded = 0;
  groupData.forEach((gd, gi) => {
    totalRowsNeeded += gd.groupHeight;
    if (gi < groupData.length - 1) totalRowsNeeded += 1;
  });

  // Insert extra rows if needed
  const templateRows = templateEndRow - startRow + 1;
  if (totalRowsNeeded > templateRows) {
    const extraRows = totalRowsNeeded - templateRows;
    for (let i = 0; i < extraRows; i++) {
      ws.insertRow(templateEndRow + 1 + i, []);
    }
  }

  const actualEndRow = startRow + Math.max(totalRowsNeeded, templateRows) - 1;
  const actualTotalRow = actualEndRow + 1;

  // Unmerge any existing template merges in the line-item area
  const mergeRanges = Object.keys((ws as any)._merges || {});
  mergeRanges.forEach((range) => {
    const [startRef, endRef = startRef] = range.split(":");
    const startRowMatch = startRef.match(/\d+/);
    const endRowMatch = endRef.match(/\d+/);
    const top = startRowMatch ? Number(startRowMatch[0]) : 0;
    const bottom = endRowMatch ? Number(endRowMatch[0]) : top;
    if (bottom >= startRow && top <= actualEndRow) {
      ws.unMergeCells(range);
    }
  });

  // Clear all line-item cells
  for (let r = startRow; r <= actualEndRow; r++) {
    ["A", "B", "C", "D", "E", "F"].forEach((col) => {
      ws.getCell(`${col}${r}`).value = null;
    });
  }

  // Render grouped line items
  const leftBorder: Partial<ExcelJS.Border> = { style: "thin" };
  let rowCursor = startRow;

  groupData.forEach((gd, gi) => {
    const groupStartRow = rowCursor;
    const { group, descHeights, groupHeight } = gd;

    // Write each description with its calculated row height
    descHeights.forEach((dh, ii) => {
      const descStartRow = rowCursor;
      const descRows = dh.rows;

      // Merge B:C across descRows if needed
      if (descRows > 1) {
        ws.mergeCells(`B${descStartRow}:C${descStartRow + descRows - 1}`);
      } else {
        ws.mergeCells(`B${descStartRow}:C${descStartRow}`);
      }
      const descCell = ws.getCell(`B${descStartRow}`);
      descCell.value = dh.item.description;
      descCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      descCell.font = calibriFont;

      // Qty, Rate, Amount on the first row of the description
      ws.getCell(`D${descStartRow}`).value = dh.item.qty;
      ws.getCell(`D${descStartRow}`).font = calibriFont;
      ws.getCell(`E${descStartRow}`).value = dh.item.rate;
      ws.getCell(`E${descStartRow}`).font = calibriFont;
      ws.getCell(`F${descStartRow}`).value = {
        formula: `E${descStartRow}*D${descStartRow}`,
        result: dh.item.amount,
      };
      ws.getCell(`F${descStartRow}`).font = calibriFont;

      rowCursor += descRows;

      // Internal separator row between descriptions within same group
      if (ii < descHeights.length - 1) {
        ws.mergeCells(`B${rowCursor}:C${rowCursor}`);
        rowCursor++;
      }
    });

    // If groupHeight > content used, add trailing empty rows
    const contentUsed = rowCursor - groupStartRow;
    const trailingRows = groupHeight - contentUsed;
    for (let t = 0; t < trailingRows; t++) {
      ws.mergeCells(`B${rowCursor}:C${rowCursor}`);
      rowCursor++;
    }

    const groupEndRow = groupStartRow + groupHeight - 1;

    // Merge Item name cell across the group height (only if > 1 row)
    if (groupHeight > 1) {
      ws.mergeCells(`A${groupStartRow}:A${groupEndRow}`);
    }
    const nameCell = ws.getCell(`A${groupStartRow}`);
    nameCell.value = group.name;
    nameCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    nameCell.font = calibriFont;

    // Reinforce A/B column borders for the group
    for (let r = groupStartRow; r <= groupEndRow; r++) {
      ws.getCell(`A${r}`).border = {
        ...ws.getCell(`A${r}`).border,
        left: leftBorder,
        right: leftBorder,
      };
      ws.getCell(`B${r}`).border = {
        ...ws.getCell(`B${r}`).border,
        left: leftBorder,
      };
    }

    // Inter-group separator row
    if (gi < groupData.length - 1) {
      ws.mergeCells(`B${rowCursor}:C${rowCursor}`);
      ws.getCell(`A${rowCursor}`).border = { left: leftBorder, right: leftBorder };
      ws.getCell(`A${rowCursor}`).font = calibriFont;
      ws.getCell(`B${rowCursor}`).font = calibriFont;
      rowCursor++;
    }
  });

  // Fill remaining empty rows
  for (let r = rowCursor; r <= actualEndRow; r++) {
    ws.mergeCells(`B${r}:C${r}`);
    ws.getCell(`A${r}`).border = { ...ws.getCell(`A${r}`).border, left: leftBorder, right: leftBorder };
    ws.getCell(`A${r}`).font = calibriFont;
    ws.getCell(`B${r}`).font = calibriFont;
  }

  // Ensure all F cells have formulas so SUM works
  for (let r = startRow; r <= actualEndRow; r++) {
    const cell = ws.getCell(`F${r}`);
    if (cell.value === null || cell.value === undefined) {
      cell.value = { formula: `E${r}*D${r}`, result: 0 };
    }
  }

  // Update Total formula
  ws.getCell(`F${actualTotalRow}`).value = {
    formula: `SUM(F${startRow}:F${actualEndRow})`,
    result: invoice.total,
  };

}

/** Wrap a render call to translate merge-overflow errors into a user-friendly message. */
async function safeRender(fn: () => void | Promise<void>) {
  try {
    await fn();
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.toLowerCase().includes("merge")) {
      throw new Error("This invoice has too many line items for a single page. Please create a continuation page to split the remaining items.");
    }
    throw err;
  }
}

/**
 * Excel export: loads the reference invoice template (.xlsx) which already
 * contains the correct layout, logos, borders, and formatting. We only
 * overwrite the dynamic data cells and clear/fill the line-item rows.
 */
export async function exportInvoiceToExcel(invoice: Invoice) {
  const wb = new ExcelJS.Workbook();
  const response = await fetch("/invoice-template.xlsx");
  const buffer = await response.arrayBuffer();
  await wb.xlsx.load(buffer);

  const ws = wb.worksheets[0];
  if (!ws) throw new Error("No worksheet found");

  // Remove extra worksheets to prevent Excel repair warnings
  while (wb.worksheets.length > 1) {
    wb.removeWorksheet(wb.worksheets[wb.worksheets.length - 1].id);
  }

  await safeRender(() => renderInvoiceToSheet(ws, invoice));

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${invoice.invoiceNumber}.xlsx`
  );
}

/**
 * Render a single invoice as one PDF page. If `existingDoc` is provided,
 * appends a new page to that doc and renders into it; otherwise creates a
 * fresh single-page jsPDF doc. Returns the doc.
 */
async function renderInvoicePDFPage(invoice: Invoice, existingDoc?: jsPDF): Promise<jsPDF> {
  // Custom margins in mm: top=0.85in, left=0.25in, right=0.2in, bottom=0in
  const marginTop = 0.85 * 25.4;   // ~21.6mm
  const marginLeft = 0.25 * 25.4;  // ~6.35mm
  const marginRight = 0.2 * 25.4;  // ~5.08mm
  const doc = existingDoc ?? new jsPDF();
  if (existingDoc) {
    existingDoc.addPage();
  }
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const isEstimate = invoice.type === "estimate";
  const docLabel = isEstimate ? "Estimate" : "Invoice";

  // Load accreditation logos
  let logosImg: string | null = null;
  try {
    const resp = await fetch("/images/accreditation-logos.png");
    if (!resp.ok) throw new Error(`Failed to fetch logos: ${resp.status}`);
    const blob = await resp.blob();
    logosImg = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Could not load accreditation logos:", err);
  }

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Environmental Design Inc.", marginLeft, marginTop);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("Professional Environmental Consultants", marginLeft, marginTop + 6);
  doc.setFont("helvetica", "normal");
  doc.text("5434 King Avenue, Suite 101", marginLeft, marginTop + 12);
  doc.text("Pennsauken, New Jersey 08109", marginLeft, marginTop + 17);
  doc.text("Phone: 856-616-9516  |  www.editesting.com", marginLeft, marginTop + 22);

  // Document label
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(docLabel.toUpperCase(), pageWidth - marginRight, marginTop, { align: "right" });

  doc.setDrawColor(200);
  doc.line(marginLeft, marginTop + 26, pageWidth - marginRight, marginTop + 26);

  // Bill To + Metadata
  let y = marginTop + 34;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", marginLeft, y);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.billTo.name, marginLeft, y + 6);
  const pdfAddrLines = splitAddress(invoice.billTo.address);
  doc.text(pdfAddrLines[0], marginLeft, y + 12);
  if (pdfAddrLines[1]) {
    doc.text(pdfAddrLines[1], marginLeft, y + 17);
  }

  const metaX = 130;
  doc.setFont("helvetica", "bold");
  doc.text(`${docLabel} #:`, metaX, y);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.invoiceNumber, metaX + 30, y);

  doc.setFont("helvetica", "bold");
  doc.text("Date:", metaX, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.date, metaX + 30, y + 6);

  if (invoice.poNumber) {
    doc.setFont("helvetica", "bold");
    doc.text("PO #:", metaX, y + 12);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.poNumber, metaX + 30, y + 12);
  }

  doc.setFont("helvetica", "bold");
  doc.text("Terms:", metaX, y + 18);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.terms, metaX + 30, y + 18);

  doc.setFont("helvetica", "bold");
  doc.text("Due Date:", metaX, y + 24);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.dueDate, metaX + 30, y + 24);

  // Project Summary
  y = y + 36;
  if (invoice.projectSummary) {
    doc.setFont("helvetica", "bold");
    doc.text("PROJECT SUMMARY", marginLeft, y);
    doc.setFont("helvetica", "normal");
    const summaryLines = doc.splitTextToSize(invoice.projectSummary, pageWidth - marginLeft - marginRight);
    doc.text(summaryLines, marginLeft, y + 6);
    y += 6 + summaryLines.length * 4 + 4;
  }

  // Line items table
  autoTable(doc, {
    startY: y,
    head: [["Item", "Description", "Qty", "Rate", "Amount"]],
    body: invoice.lineItems.map((li) => [
      li.name,
      li.description,
      li.qty.toString(),
      `$${li.rate.toFixed(2)}`,
      `$${li.amount.toFixed(2)}`,
    ]),
    foot: [["", "", "", "Total", `$${invoice.total.toFixed(2)}`]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [60, 60, 60] },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
    },
    margin: { left: marginLeft, right: marginRight },
  });

  // Footer
  const finalY = (doc as any).lastAutoTable?.finalY || y + 40;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(
    "EDI is a Service Disabled Veteran Owned Small Business!",
    pageWidth / 2,
    finalY + 15,
    { align: "center" }
  );
  doc.text(
    "If you have any questions please call 856-616-9516",
    pageWidth / 2,
    finalY + 20,
    { align: "center" }
  );

  // Accreditation logos
  if (logosImg) {
    const imgWidth = 120;
    const imgHeight = 30;
    const imgX = (pageWidth - imgWidth) / 2;
    const imgY = pageHeight - imgHeight - 10;
    doc.addImage(logosImg, "PNG", imgX, imgY, imgWidth, imgHeight);
  }

  return doc;
}

/** Export a single invoice as a one-page PDF. */
export async function exportInvoiceToPDF(invoice: Invoice) {
  const doc = await renderInvoicePDFPage(invoice);
  doc.save(`${invoice.invoiceNumber}.pdf`);
}

/**
 * Combined PDF export: renders the parent invoice as page 1 and each
 * continuation as a subsequent page in the same PDF. Each page is
 * byte-identical to the standalone single-invoice PDF.
 */
export async function exportCombinedInvoiceToPDF(parent: Invoice, continuations: Invoice[]) {
  const ordered = [...continuations].sort((a, b) => {
    const sa = parseInt(a.invoiceNumber.split("-").pop() || "0", 10);
    const sb = parseInt(b.invoiceNumber.split("-").pop() || "0", 10);
    return sa - sb;
  });

  const doc = await renderInvoicePDFPage(parent);
  for (const cont of ordered) {
    await renderInvoicePDFPage(cont, doc);
  }
  doc.save(`${parent.invoiceNumber}-combined.pdf`);
}
