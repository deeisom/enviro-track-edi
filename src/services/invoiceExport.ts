import { Invoice } from "@/types/invoice";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  // --- Dynamic metadata ---
  // Bill To (A11 = name, A12 = address line 1, A13 = address line 2)
  ws.getCell("A11").value = invoice.billTo.name;
  const addrLines = invoice.billTo.address.split("\n");
  ws.getCell("A12").value = addrLines[0] || "";
  ws.getCell("A13").value = addrLines.slice(1).join(", ") || "";

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

    // Item name on first row only
    ws.getCell(`A${rowCursor}`).value = item.name;

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
    for (let r = rowCursor + 1; r <= descEndRow; r++) {
      const cell = ws.getCell(`A${r}`);
      cell.border = { ...cell.border, left: leftBorder };
    }
    ws.getCell(`A${descEndRow}`).border = {
      ...ws.getCell(`A${descEndRow}`).border,
      left: leftBorder,
      right: leftBorder,
    };

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
  doc.text("Environmental Design Inc.", 14, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("Professional Environmental Consultants", 14, 26);
  doc.setFont("helvetica", "normal");
  doc.text("5434 King Avenue, Suite 101", 14, 32);
  doc.text("Pennsauken, New Jersey 08109", 14, 37);
  doc.text("Phone: 856-616-9516  |  www.editesting.com", 14, 42);

  // Document label
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(docLabel.toUpperCase(), pageWidth - 14, 20, { align: "right" });

  doc.setDrawColor(200);
  doc.line(14, 46, pageWidth - 14, 46);

  // Bill To + Metadata
  let y = 54;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.billTo.name, 14, y + 6);
  const addressLines = doc.splitTextToSize(invoice.billTo.address, 80);
  doc.text(addressLines, 14, y + 12);

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
    doc.text("PROJECT SUMMARY", 14, y);
    doc.setFont("helvetica", "normal");
    const summaryLines = doc.splitTextToSize(invoice.projectSummary, pageWidth - 28);
    doc.text(summaryLines, 14, y + 6);
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
    margin: { left: 14, right: 14 },
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
