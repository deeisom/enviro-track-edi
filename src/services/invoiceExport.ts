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
  ws.pageSetup.fitToHeight = 0; // Will be updated after page-packing
  ws.pageSetup.paperSize = 1; // US Letter

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

  // --- Multi-page packing ---
  const MAX_ITEM_ROWS = 23; // rows 21–43
  const ROWS_PER_PAGE = 44; // 20 header + 23 items + 1 total

  // Pack groups into pages (a group is never split across pages)
  interface PageAllocation {
    groups: typeof groupData;
    usedRows: number;
  }
  const pages: PageAllocation[] = [];
  let currentPage: PageAllocation = { groups: [], usedRows: 0 };

  for (let gi = 0; gi < groupData.length; gi++) {
    const gd = groupData[gi];
    const separatorRow = currentPage.groups.length > 0 ? 1 : 0;
    const needed = gd.groupHeight + separatorRow;

    if (currentPage.usedRows + needed > MAX_ITEM_ROWS && currentPage.groups.length > 0) {
      // Start a new page
      pages.push(currentPage);
      currentPage = { groups: [gd], usedRows: gd.groupHeight };
    } else {
      currentPage.groups.push(gd);
      currentPage.usedRows += needed;
    }
  }
  if (currentPage.groups.length > 0) {
    pages.push(currentPage);
  }
  // Ensure at least one page
  if (pages.length === 0) {
    pages.push({ groups: [], usedRows: 0 });
  }

  // Lock fitToHeight to exact page count
  ws.pageSetup.fitToHeight = pages.length;

  // Calculate total worksheet rows needed
  const totalWsRows = pages.length * ROWS_PER_PAGE;

  // Unmerge any existing template merges in the line-item area (rows 21–43 of page 1)
  const mergeRanges = Object.keys((ws as any)._merges || {});
  mergeRanges.forEach((range) => {
    const [startRef, endRef = startRef] = range.split(":");
    const startRowMatch = startRef.match(/\d+/);
    const endRowMatch = endRef.match(/\d+/);
    const top = startRowMatch ? Number(startRowMatch[0]) : 0;
    const bottom = endRowMatch ? Number(endRowMatch[0]) : top;
    if (bottom >= startRow && top <= templateEndRow) {
      ws.unMergeCells(range);
    }
  });

  // Safe merge helper — unmerge any overlapping ranges before merging
  function safeMerge(range: string) {
    const currentMerges = Object.keys((ws as any)._merges || {});
    const [newStart, newEnd = newStart] = range.split(":");
    const newTopMatch = newStart.match(/\d+/);
    const newBottomMatch = newEnd.match(/\d+/);
    const newTop = newTopMatch ? Number(newTopMatch[0]) : 0;
    const newBottom = newBottomMatch ? Number(newBottomMatch[0]) : newTop;
    const newLeftCol = newStart.replace(/\d+/, "");
    const newRightCol = newEnd.replace(/\d+/, "");

    for (const existing of currentMerges) {
      const [eStart, eEnd = eStart] = existing.split(":");
      const eTopMatch = eStart.match(/\d+/);
      const eBottomMatch = eEnd.match(/\d+/);
      const eTop = eTopMatch ? Number(eTopMatch[0]) : 0;
      const eBottom = eBottomMatch ? Number(eBottomMatch[0]) : eTop;
      const eLeftCol = eStart.replace(/\d+/, "");
      const eRightCol = eEnd.replace(/\d+/, "");

      // Check row overlap
      if (eBottom >= newTop && eTop <= newBottom) {
        // Check column overlap (simple letter comparison for A-F)
        if (eLeftCol <= newRightCol && eRightCol >= newLeftCol) {
          try { ws.unMergeCells(existing); } catch { /* already unmerged */ }
        }
      }
    }
    ws.mergeCells(range);
  }

  // Helper to copy header from page 1 (rows 1–20) into a page offset
  function copyHeader(pageIndex: number) {
    const offset = pageIndex * ROWS_PER_PAGE;
    // Copy cell values, styles, and merges from rows 1–20
    for (let r = 1; r <= 20; r++) {
      const targetRow = offset + r;
      const srcRow = ws.getRow(r);
      const tgtRow = ws.getRow(targetRow);
      tgtRow.height = srcRow.height;

      ["A", "B", "C", "D", "E", "F"].forEach((col) => {
        const srcCell = ws.getCell(`${col}${r}`);
        const tgtCell = ws.getCell(`${col}${targetRow}`);
        tgtCell.value = srcCell.value;
        tgtCell.font = srcCell.font ? { ...srcCell.font } : undefined;
        tgtCell.alignment = srcCell.alignment ? { ...srcCell.alignment } : undefined;
        tgtCell.border = srcCell.border ? { ...srcCell.border } : undefined;
        tgtCell.fill = srcCell.fill ? { ...srcCell.fill } : undefined;
        tgtCell.numFmt = srcCell.numFmt;
      });
    }

    // Recreate known header merges at the offset
    const headerMerges = [
      "A1:F1", "A2:F2", "A3:F3", "A4:F4", "A5:F5",
      "A6:B6", "A7:B7", "A8:C8", "A9:F9",
      "A10:B10", "C10:D10",
      "A11:B11", "A12:B12", "A13:B13",
      "C11:D11", "C12:D12", "C13:D13",
      "A14:B14", "C14:D14",
      "A15:B15", "C15:D15",
      "A16:F16",
      "A17:F19",
      "A20:A20", "B20:C20",
    ];
    for (const merge of headerMerges) {
      const [mStart, mEnd = mStart] = merge.split(":");
      const mStartCol = mStart.replace(/\d+/, "");
      const mStartRow = Number(mStart.replace(/[A-Z]+/, ""));
      const mEndCol = mEnd.replace(/\d+/, "");
      const mEndRow = Number(mEnd.replace(/[A-Z]+/, ""));
      const newRange = `${mStartCol}${mStartRow + offset}:${mEndCol}${mEndRow + offset}`;
      try { safeMerge(newRange); } catch { /* skip if merge fails */ }
    }
  }

  // Render line items for each page
  const leftBorder: Partial<ExcelJS.Border> = { style: "thin" };
  const allItemRanges: string[] = []; // Track F-column ranges for total formula

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const page = pages[pageIdx];
    const offset = pageIdx * ROWS_PER_PAGE;
    const pageStartRow = offset + startRow; // line items start
    const pageEndRow = offset + templateEndRow; // line items end (row 43 offset)
    const pageTotalRow = offset + ROWS_PER_PAGE; // row 44 offset

    // For pages 2+, copy header
    if (pageIdx > 0) {
      copyHeader(pageIdx);
      // Add page break before this page's header
      ws.getRow(offset + 1).addPageBreak();
    }

    // Set explicit row heights for line-item rows (21–43) and total row (44)
    // Usable height: 10.15" = ~731 points; 731 / 44 ≈ 16.6 points per row
    const LINE_ITEM_ROW_HEIGHT = 16.6;
    for (let r = offset + startRow; r <= offset + ROWS_PER_PAGE; r++) {
      ws.getRow(r).height = LINE_ITEM_ROW_HEIGHT;
    }

    // Clear line-item area for this page
    for (let r = pageStartRow; r <= pageEndRow; r++) {
      ["A", "B", "C", "D", "E", "F"].forEach((col) => {
        ws.getCell(`${col}${r}`).value = null;
      });
    }

    // Render groups for this page
    let rowCursor = pageStartRow;

    page.groups.forEach((gd, gi) => {
      const groupStartRow = rowCursor;
      const { group, descHeights, groupHeight } = gd;

      // Write each description
      descHeights.forEach((dh, ii) => {
        const descStartRow = rowCursor;
        const descRows = dh.rows;

        // Merge B:C across descRows
        if (descRows > 1) {
          safeMerge(`B${descStartRow}:C${descStartRow + descRows - 1}`);
        } else {
          safeMerge(`B${descStartRow}:C${descStartRow}`);
        }
        const descCell = ws.getCell(`B${descStartRow}`);
        descCell.value = dh.item.description;
        descCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
        descCell.font = calibriFont;

        // Qty, Rate, Amount on first row
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

        // Internal separator
        if (ii < descHeights.length - 1) {
          safeMerge(`B${rowCursor}:C${rowCursor}`);
          rowCursor++;
        }
      });

      // Trailing empty rows for group
      const contentUsed = rowCursor - groupStartRow;
      const trailingRows = groupHeight - contentUsed;
      for (let t = 0; t < trailingRows; t++) {
        safeMerge(`B${rowCursor}:C${rowCursor}`);
        rowCursor++;
      }

      const groupEndRow = groupStartRow + groupHeight - 1;

      // Merge Item name cell
      if (groupHeight > 1) {
        safeMerge(`A${groupStartRow}:A${groupEndRow}`);
      }
      const nameCell = ws.getCell(`A${groupStartRow}`);
      nameCell.value = group.name;
      nameCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      nameCell.font = calibriFont;

      // Borders for A/B
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

      // Inter-group separator
      if (gi < page.groups.length - 1) {
        safeMerge(`B${rowCursor}:C${rowCursor}`);
        ws.getCell(`A${rowCursor}`).border = { left: leftBorder, right: leftBorder };
        ws.getCell(`A${rowCursor}`).font = calibriFont;
        ws.getCell(`B${rowCursor}`).font = calibriFont;
        rowCursor++;
      }
    });

    // Fill remaining empty rows on this page
    for (let r = rowCursor; r <= pageEndRow; r++) {
      safeMerge(`B${r}:C${r}`);
      ws.getCell(`A${r}`).border = { ...ws.getCell(`A${r}`).border, left: leftBorder, right: leftBorder };
      ws.getCell(`A${r}`).font = calibriFont;
      ws.getCell(`B${r}`).font = calibriFont;
    }

    // Ensure all F cells have formulas
    for (let r = pageStartRow; r <= pageEndRow; r++) {
      const cell = ws.getCell(`F${r}`);
      if (cell.value === null || cell.value === undefined) {
        cell.value = { formula: `E${r}*D${r}`, result: 0 };
      }
    }

    allItemRanges.push(`F${pageStartRow}:F${pageEndRow}`);

    // Clear total row for intermediate pages
    if (pageIdx < pages.length - 1) {
      ["A", "B", "C", "D", "E", "F"].forEach((col) => {
        ws.getCell(`${col}${pageTotalRow}`).value = null;
      });
    }
  }

  // Total formula on the last page's total row
  const lastPageOffset = (pages.length - 1) * ROWS_PER_PAGE;
  const lastTotalRow = lastPageOffset + ROWS_PER_PAGE;
  const totalFormula = allItemRanges.length === 1
    ? `SUM(${allItemRanges[0]})`
    : `SUM(${allItemRanges.join(",")})`;
  ws.getCell(`F${lastTotalRow}`).value = {
    formula: totalFormula,
    result: invoice.total,
  };

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
