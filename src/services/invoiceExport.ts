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

  // Clear all line item rows (21-43) to remove phantom/template content
  const startRow = 21;
  for (let r = startRow; r <= 43; r++) {
    ws.getCell(`A${r}`).value = null;
    ws.getCell(`B${r}`).value = null;
    ws.getCell(`D${r}`).value = null;
    ws.getCell(`E${r}`).value = null;
    ws.getCell(`F${r}`).value = null;
  }

  // Line items — spaced every 3 rows to match template layout
  invoice.lineItems.forEach((item, i) => {
    const row = startRow + (i * 3);
    if (row > 43) return;
    ws.getCell(`A${row}`).value = item.name;
    ws.getCell(`B${row}`).value = item.description;
    ws.getCell(`D${row}`).value = item.qty;
    ws.getCell(`E${row}`).value = item.rate;
    ws.getCell(`F${row}`).value = { formula: `E${row}*D${row}`, result: item.amount };
  });

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
    const blob = await resp.blob();
    logosImg = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    console.warn("Could not load accreditation logos");
  }
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

  doc.save(`${invoice.invoiceNumber}.pdf`);
}
