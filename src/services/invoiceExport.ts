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

  // --- Line items (rows 21–43) ---
  const startRow = 21;
  const endRow = 43;
  const descRows = 4; // rows to merge for each description cell
  const rowsPerItem = descRows + 1; // description rows + 1 blank separator

  // Properly unmerge any existing template merges in the line-item area
  const mergeRanges = Object.keys((ws as any)._merges || {});
  mergeRanges.forEach((range) => {
    const [startRef, endRef = startRef] = range.split(":");
    const startRowMatch = startRef.match(/\d+/);
    const endRowMatch = endRef.match(/\d+/);
    const top = startRowMatch ? Number(startRowMatch[0]) : 0;
    const bottom = endRowMatch ? Number(endRowMatch[0]) : top;

    if (bottom >= startRow && top <= endRow) {
      ws.unMergeCells(range);
    }
  });

  // Clear all line-item cells but preserve border formatting
  for (let r = startRow; r <= endRow; r++) {
    ["A", "B", "C", "D", "E", "F"].forEach((col) => {
      ws.getCell(`${col}${r}`).value = null;
    });
  }

  // Fill line items
  const leftBorder: Partial<ExcelJS.Border> = { style: "thin" };
  const usedRows = new Set<number>();

  let rowCursor = startRow;
  invoice.lineItems.forEach((item) => {
    if (rowCursor + descRows - 1 > endRow) return;

    // Item name – merge 2 rows with wrap text and center
    ws.mergeCells(`A${rowCursor}:A${rowCursor + 1}`);
    const nameCell = ws.getCell(`A${rowCursor}`);
    nameCell.value = item.name;
    nameCell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    // Merge B:C across description rows and set description with wrap text
    const descEndRow = rowCursor + descRows - 1;
    ws.mergeCells(`B${rowCursor}:C${descEndRow}`);
    const descCell = ws.getCell(`B${rowCursor}`);
    descCell.value = item.description;
    descCell.alignment = {
      horizontal: "left",
      vertical: "top",
      wrapText: true,
    };

    // Add left border on non-first rows of this item block (A column)
    // Add right border on the last description row of each block
    for (let r = rowCursor; r <= descEndRow; r++) {
      const cell = ws.getCell(`A${r}`);
      cell.border = { ...cell.border, left: leftBorder, right: leftBorder };
    }

    // Qty, Rate, Amount on first row only
    ws.getCell(`D${rowCursor}`).value = item.qty;
    ws.getCell(`E${rowCursor}`).value = item.rate;
    ws.getCell(`F${rowCursor}`).value = {
      formula: `E${rowCursor}*D${rowCursor}`,
      result: item.amount,
    };

    for (let r = rowCursor; r <= Math.min(rowCursor + rowsPerItem - 1, endRow); r++) {
      usedRows.add(r);
    }

    // Merge B:C on the blank separator row after this item
    const sepRow = rowCursor + descRows;
    if (sepRow <= endRow) {
      ws.mergeCells(`B${sepRow}:C${sepRow}`);
    }

    // Advance past description rows + 1 blank separator row
    rowCursor += rowsPerItem;
  });

  // Merge B:C on all empty/blank rows so they match the filled rows
  for (let r = startRow; r <= endRow; r++) {
    if (!usedRows.has(r)) {
      ws.mergeCells(`B${r}:C${r}`);
      const cell = ws.getCell(`A${r}`);
      cell.border = { ...cell.border, left: leftBorder };
    }
  }

  // Ensure all F cells in the range have formulas so the SUM in F44 works
  for (let r = startRow; r <= endRow; r++) {
    const cell = ws.getCell(`F${r}`);
    if (cell.value === null || cell.value === undefined) {
      cell.value = { formula: `E${r}*D${r}`, result: 0 };
    }
  }

  // Total formula is already in F44 (=SUM(F16:F43)) — no need to touch it

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${invoice.invoiceNumber}.xlsx`
  );
}

export async function exportInvoiceToPDF(invoice: Invoice) {
  // Custom margins in mm: top=0.85in, left=0.25in, right=0.2in, bottom=0in
  const marginTop = 0.85 * 25.4;   // ~21.6mm
  const marginLeft = 0.25 * 25.4;  // ~6.35mm
  const marginRight = 0.2 * 25.4;  // ~5.08mm
  const doc = new jsPDF();
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

  doc.save(`${invoice.invoiceNumber}.pdf`);
}
