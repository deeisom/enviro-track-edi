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

  // Keep template's original page setup (scale: 84%, fitToWidth: 1, fitToHeight: 0)
  // Only ensure paper size is US Letter
  (ws.pageSetup as any).paperSize = 1;

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
  const ROWS_PER_PAGE = 52; // full template height, including total/footer/logo rows
  const PAGE_TOTAL_START_ROW = 44;
  const PAGE_TOTAL_END_ROW = 45;

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
  if (pages.length === 0) {
    pages.push({ groups: [], usedRows: 0 });
  }

  // Set print area to cover all pages without overriding scale/fitToHeight
  const totalWsRows = pages.length * ROWS_PER_PAGE;
  ws.pageSetup.printArea = `A1:F${totalWsRows}`;

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

  const templatePageMerges = Object.keys((ws as any)._merges || {}).filter((range) => {
    const [startRef, endRef = startRef] = range.split(":");
    const startRowMatch = startRef.match(/\d+/);
    const endRowMatch = endRef.match(/\d+/);
    const top = startRowMatch ? Number(startRowMatch[0]) : 0;
    const bottom = endRowMatch ? Number(endRowMatch[0]) : top;
    return top >= 1 && bottom <= ROWS_PER_PAGE;
  });

  type TemplateImage = {
    imageId: number;
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
    editAs?: string;
  };

  const templateImages: TemplateImage[] = (typeof (ws as any).getImages === "function" ? (ws as any).getImages() : [])
    .map((image: any) => {
      const range = image.range ?? {};
      const tl = range.tl ?? range._from;
      const br = range.br ?? range._to;
      if (!tl || !br) return null;

      return {
        imageId: image.imageId,
        fromRow: tl.nativeRow ?? tl.row ?? 0,
        fromCol: tl.nativeCol ?? tl.col ?? 0,
        toRow: br.nativeRow ?? br.row ?? 0,
        toCol: br.nativeCol ?? br.col ?? 0,
        editAs: range.editAs,
      };
    })
    .filter((image): image is TemplateImage => image !== null)
    .filter((image) => image.fromRow < ROWS_PER_PAGE);

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

      if (eBottom >= newTop && eTop <= newBottom) {
        if (eLeftCol <= newRightCol && eRightCol >= newLeftCol) {
          try { ws.unMergeCells(existing); } catch { }
        }
      }
    }
    ws.mergeCells(range);
  }

  // Build set of "slave" cells (non-master cells in template merges)
  const slaveCells = new Set<string>();
  for (const merge of templatePageMerges) {
    const [mStart, mEnd = mStart] = merge.split(":");
    const startCol = mStart.replace(/\d+/, "");
    const startRowNum = Number(mStart.replace(/[A-Z]+/, ""));
    const endCol = mEnd.replace(/\d+/, "");
    const endRowNum = Number(mEnd.replace(/[A-Z]+/, ""));
    const cols = ["A", "B", "C", "D", "E", "F"].filter(c => c >= startCol && c <= endCol);
    for (let r = startRowNum; r <= endRowNum; r++) {
      for (const c of cols) {
        if (c === startCol && r === startRowNum) continue; // skip master
        slaveCells.add(`${c}${r}`);
      }
    }
  }

  function copyTemplatePage(pageIndex: number) {
    const offset = pageIndex * ROWS_PER_PAGE;

    // Apply merges first so structure is in place
    for (const merge of templatePageMerges) {
      const [mStart, mEnd = mStart] = merge.split(":");
      const mStartCol = mStart.replace(/\d+/, "");
      const mStartRow = Number(mStart.replace(/[A-Z]+/, ""));
      const mEndCol = mEnd.replace(/\d+/, "");
      const mEndRow = Number(mEnd.replace(/[A-Z]+/, ""));
      const newRange = `${mStartCol}${mStartRow + offset}:${mEndCol}${mEndRow + offset}`;
      safeMerge(newRange);
    }

    // Copy cells — skip .value for slave cells to prevent duplication
    for (let r = 1; r <= ROWS_PER_PAGE; r++) {
      const targetRow = offset + r;
      const srcRow = ws.getRow(r);
      const tgtRow = ws.getRow(targetRow);
      tgtRow.height = srcRow.height;

      ["A", "B", "C", "D", "E", "F"].forEach((col) => {
        const srcCell = ws.getCell(`${col}${r}`);
        const tgtCell = ws.getCell(`${col}${targetRow}`);
        if (!slaveCells.has(`${col}${r}`)) {
          tgtCell.value = srcCell.value;
        }
        tgtCell.font = srcCell.font ? { ...srcCell.font } : undefined;
        tgtCell.alignment = srcCell.alignment ? { ...srcCell.alignment } : undefined;
        tgtCell.border = srcCell.border ? { ...srcCell.border } : undefined;
        tgtCell.fill = srcCell.fill ? { ...srcCell.fill } : undefined;
        tgtCell.numFmt = srcCell.numFmt;
      });
    }

    // Copy images with offset
    templateImages.forEach((image) => {
      (ws as any).addImage(image.imageId, {
        tl: { col: image.fromCol, row: image.fromRow + offset },
        br: { col: image.toCol, row: image.toRow + offset },
        editAs: image.editAs ?? "oneCell",
      });
    });
  }

  for (let pageIdx = 1; pageIdx < pages.length; pageIdx++) {
    copyTemplatePage(pageIdx);
    ws.getRow(pageIdx * ROWS_PER_PAGE + 1).addPageBreak();
  }

  // Render line items for each page
  const leftBorder: Partial<ExcelJS.Border> = { style: "thin" };
  const allItemRanges: string[] = [];

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const page = pages[pageIdx];
    const offset = pageIdx * ROWS_PER_PAGE;
    const pageStartRow = offset + startRow;
    const pageEndRow = offset + templateEndRow;
    const pageTotalStartRow = offset + PAGE_TOTAL_START_ROW;
    const pageTotalEndRow = offset + PAGE_TOTAL_END_ROW;

    for (let r = pageStartRow; r <= pageEndRow; r++) {
      ["A", "B", "C", "D", "E", "F"].forEach((col) => {
        ws.getCell(`${col}${r}`).value = null;
      });
    }

    let rowCursor = pageStartRow;

    page.groups.forEach((gd, gi) => {
      const groupStartRow = rowCursor;
      const { group, descHeights, groupHeight } = gd;

      descHeights.forEach((dh, ii) => {
        const descStartRow = rowCursor;
        const descRows = dh.rows;

        if (descRows > 1) {
          safeMerge(`B${descStartRow}:C${descStartRow + descRows - 1}`);
        } else {
          safeMerge(`B${descStartRow}:C${descStartRow}`);
        }
        const descCell = ws.getCell(`B${descStartRow}`);
        descCell.value = dh.item.description;
        descCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
        descCell.font = calibriFont;

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

        if (ii < descHeights.length - 1) {
          safeMerge(`B${rowCursor}:C${rowCursor}`);
          rowCursor++;
        }
      });

      const contentUsed = rowCursor - groupStartRow;
      const trailingRows = groupHeight - contentUsed;
      for (let t = 0; t < trailingRows; t++) {
        safeMerge(`B${rowCursor}:C${rowCursor}`);
        rowCursor++;
      }

      const groupEndRow = groupStartRow + groupHeight - 1;

      if (groupHeight > 1) {
        safeMerge(`A${groupStartRow}:A${groupEndRow}`);
      }
      const nameCell = ws.getCell(`A${groupStartRow}`);
      nameCell.value = group.name;
      nameCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      nameCell.font = calibriFont;

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

      if (gi < page.groups.length - 1) {
        safeMerge(`B${rowCursor}:C${rowCursor}`);
        ws.getCell(`A${rowCursor}`).border = { left: leftBorder, right: leftBorder };
        ws.getCell(`A${rowCursor}`).font = calibriFont;
        ws.getCell(`B${rowCursor}`).font = calibriFont;
        rowCursor++;
      }
    });

    for (let r = rowCursor; r <= pageEndRow; r++) {
      safeMerge(`B${r}:C${r}`);
      ws.getCell(`A${r}`).border = { ...ws.getCell(`A${r}`).border, left: leftBorder, right: leftBorder };
      ws.getCell(`A${r}`).font = calibriFont;
      ws.getCell(`B${r}`).font = calibriFont;
    }

    for (let r = pageStartRow; r <= pageEndRow; r++) {
      const cell = ws.getCell(`F${r}`);
      if (cell.value === null || cell.value === undefined) {
        cell.value = { formula: `E${r}*D${r}`, result: 0 };
      }
    }

    allItemRanges.push(`F${pageStartRow}:F${pageEndRow}`);

    if (pageIdx < pages.length - 1) {
      for (let r = pageTotalStartRow; r <= pageTotalEndRow; r++) {
        ["A", "B", "C", "D", "E", "F"].forEach((col) => {
          ws.getCell(`${col}${r}`).value = null;
        });
      }
    }
  }

  const lastPageOffset = (pages.length - 1) * ROWS_PER_PAGE;
  const lastTotalRow = lastPageOffset + PAGE_TOTAL_START_ROW;
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
