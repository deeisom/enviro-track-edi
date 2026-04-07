import { Invoice } from "@/types/invoice";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function exportInvoiceToExcel(invoice: Invoice) {
  const wb = new ExcelJS.Workbook();
  const response = await fetch("/invoice-template.xltx");
  const buffer = await response.arrayBuffer();
  await wb.xlsx.load(buffer);

  const ws = wb.getWorksheet("INV") || wb.worksheets[0];
  if (!ws) throw new Error("No worksheet found");

  // Bill To
  ws.getCell("A11").value = invoice.billTo.name;
  ws.getCell("A12").value = invoice.billTo.address;

  // Metadata
  ws.getCell("C13").value = invoice.projectId ? `EDI-${invoice.invoiceNumber}` : "";
  ws.getCell("E13").value = invoice.date;
  ws.getCell("F13").value = invoice.invoiceNumber;
  ws.getCell("C15").value = invoice.poNumber;
  ws.getCell("E15").value = invoice.terms;
  ws.getCell("F15").value = invoice.dueDate;

  // Project Summary
  ws.getCell("A17").value = invoice.projectSummary;

  // Unmerge all existing B:C merges in rows 21-43
  const startRow = 21;
  const endRow = 43;
  const merges = ws.model?.merges ? [...ws.model.merges] : [];
  for (const merge of merges) {
    const match = merge.match(/^[BC](\d+):[BC](\d+)$/i);
    if (match) {
      const r1 = parseInt(match[1]);
      const r2 = parseInt(match[2]);
      if (r1 >= startRow && r2 <= endRow) {
        try { ws.unMergeCells(merge); } catch {}
      }
    }
  }

  // Clear all line item rows (21-43) including column C
  for (let r = startRow; r <= endRow; r++) {
    ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
      ws.getCell(`${col}${r}`).value = null;
    });
  }

  // Widen column A to fit longer item names like "Program Administration"
  ws.getColumn('A').width = 35;

  // Consistent font for all line item cells
  const itemFont = { name: 'Calibri', size: 11 };

  // Line items — dynamic row heights based on description length
  const B_C_WIDTH_CHARS = 52;
  let rowCursor = startRow;

  // Track which rows are used by multi-row merges so we skip them later
  const mergedRows = new Set<number>();

  invoice.lineItems.forEach((item) => {
    if (rowCursor > endRow) return;
    const rowsNeeded = Math.max(1, Math.ceil((item.description?.length || 1) / B_C_WIDTH_CHARS));

    // Item name in column A with wrap text
    const cellA = ws.getCell(`A${rowCursor}`);
    cellA.value = item.name;
    cellA.alignment = { wrapText: true, vertical: 'middle' };
    cellA.font = itemFont;

    // Description in merged B:C with wrap text
    ws.mergeCells(`B${rowCursor}:C${rowCursor + rowsNeeded - 1}`);
    for (let r = rowCursor; r < rowCursor + rowsNeeded; r++) {
      mergedRows.add(r);
    }
    const cellB = ws.getCell(`B${rowCursor}`);
    cellB.value = item.description;
    cellB.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
    cellB.font = itemFont;

    // Qty, Rate, Amount
    const cellD = ws.getCell(`D${rowCursor}`);
    cellD.value = item.qty;
    cellD.font = itemFont;
    const cellE = ws.getCell(`E${rowCursor}`);
    cellE.value = item.rate;
    cellE.font = itemFont;
    const cellF = ws.getCell(`F${rowCursor}`);
    cellF.value = { formula: `E${rowCursor}*D${rowCursor}`, result: item.amount };
    cellF.font = itemFont;

    rowCursor += rowsNeeded + 1; // 1 blank row separator
  });

  // Merge & Center ALL remaining B:C rows (including blank separator rows)
  for (let r = startRow; r <= endRow; r++) {
    if (!mergedRows.has(r)) {
      ws.mergeCells(`B${r}:C${r}`);
    }
  }

  // Ensure left border on all B cells in the line item area for visual continuity
  const thinBorder = { style: 'thin' as const };
  for (let r = startRow; r <= endRow; r++) {
    const cellB = ws.getCell(`B${r}`);
    cellB.border = {
      ...cellB.border,
      left: thinBorder,
    };
  }

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${invoice.invoiceNumber}.xlsx`);
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

  // Right side metadata
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
    body: invoice.lineItems.map(li => [
      li.name,
      li.description,
      li.qty.toString(),
      `$${li.rate.toFixed(2)}`,
      `$${li.amount.toFixed(2)}`,
    ]),
    foot: [["", "", "", "Total", `$${invoice.total.toFixed(2)}`]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [60, 60, 60] },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
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
  doc.text("EDI is a Service Disabled Veteran Owned Small Business!", pageWidth / 2, finalY + 15, { align: "center" });
  doc.text("If you have any questions please call 856-616-9516", pageWidth / 2, finalY + 20, { align: "center" });

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
