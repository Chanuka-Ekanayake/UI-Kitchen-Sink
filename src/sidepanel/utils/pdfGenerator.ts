import jsPDF from 'jspdf';
import autoTable, { RowInput, CellInput } from 'jspdf-autotable';
import { ValidationResult, PropertyResult } from '../../shared/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PdfExportOptions {
  results: ValidationResult[];
  profileName: string;
  pageUrl?: string;
  scannedAt?: Date;
}

// ─── Colour palette ───────────────────────────────────────────────────────────

const BRAND_GREEN  = '#008000';
const PASS_GREEN   = '#d1fae5';   // tailwind green-100
const PASS_TEXT    = '#065f46';   // tailwind green-800
const FAIL_RED     = '#fee2e2';   // tailwind red-100
const FAIL_TEXT    = '#991b1b';   // tailwind red-800
const HEADER_BG    = '#1e293b';   // slate-800
const HEADER_TEXT  = '#f8fafc';   // slate-50
const SUBROW_BG    = '#f8fafc';   // slate-50
const BORDER_COLOR = '#e2e8f0';   // slate-200

// hex to [r,g,b]
function hex(h: string): [number, number, number] {
  const c = h.replace('#', '');
  return [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ];
}

// ─── Main export function ─────────────────────────────────────────────────────

export async function generateAuditPdf(opts: PdfExportOptions): Promise<void> {
  const { results, profileName, pageUrl = 'Unknown', scannedAt = new Date() } = opts;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;

  // ── Pre-compute summary numbers ─────────────────────────────────────────────
  let totalPasses  = 0;
  let totalFails   = 0;
  let totalChecks  = 0;

  for (const r of results) {
    for (const p of r.results) {
      totalChecks++;
      if (p.passed) totalPasses++; else totalFails++;
    }
  }

  // ── Page header helper ──────────────────────────────────────────────────────
  const addPageHeader = (doc: jsPDF, pageNum: number) => {
    doc.setFillColor(...hex(HEADER_BG));
    doc.rect(0, 0, pageW, 14, 'F');
    doc.setTextColor(...hex(HEADER_TEXT));
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Design System Audit Report', margin, 9.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Page ${pageNum}`, pageW - margin, 9.5, { align: 'right' });
  };

  // ── Cover / header block ────────────────────────────────────────────────────
  addPageHeader(doc, 1);

  let y = 22;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...hex(BRAND_GREEN));
  doc.text('Design System Audit Report', margin, y);
  y += 8;

  // Thin green rule
  doc.setDrawColor(...hex(BRAND_GREEN));
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  // Metadata block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);

  const meta: [string, string][] = [
    ['Profile',    profileName],
    ['Target URL', pageUrl],
    ['Scanned At', scannedAt.toLocaleString()],
  ];
  for (const [label, value] of meta) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 28, y);
    y += 5;
  }
  y += 3;

  // ── Executive summary table ─────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);   // slate-800
  doc.text('Executive Summary', margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Components Scanned', 'Total Checks', 'Passes ✓', 'Failures ✗', 'Pass Rate']],
    body: [[
      String(results.length),
      String(totalChecks),
      String(totalPasses),
      String(totalFails),
      totalChecks > 0 ? `${Math.round((totalPasses / totalChecks) * 100)}%` : 'N/A',
    ]],
    headStyles: {
      fillColor: hex(HEADER_BG),
      textColor: hex(HEADER_TEXT),
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      3: { textColor: hex(FAIL_TEXT) },
      2: { textColor: hex(PASS_TEXT) },
      4: { fontStyle: 'bold' },
    },
    theme: 'grid',
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Detailed results table ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Detailed Audit Results', margin, y);
  y += 4;

  // Build flat row list
  const tableRows: RowInput[] = [];

  for (const vr of results) {
    const componentChecks = vr.results.length;
    const componentPasses = vr.results.filter(p => p.passed).length;
    const allPass = componentPasses === componentChecks;

    // Component sub-header row
    tableRows.push([
      {
        content: vr.componentName,
        styles: {
          fontStyle: 'bold',
          fillColor: hex(SUBROW_BG),
          textColor: hex('#1e293b'),
        },
      } as CellInput,
      {
        content: vr.elementSelector,
        styles: {
          fontStyle: 'normal',
          fillColor: hex(SUBROW_BG),
          textColor: hex('#475569'),
          font: 'courier',
        },
      } as CellInput,
      { content: '', styles: { fillColor: hex(SUBROW_BG) } } as CellInput,
      { content: '', styles: { fillColor: hex(SUBROW_BG) } } as CellInput,
      { content: '', styles: { fillColor: hex(SUBROW_BG) } } as CellInput,
      {
        content: allPass ? '✓ ALL PASS' : `${componentPasses}/${componentChecks}`,
        styles: {
          fontStyle: 'bold',
          fillColor: hex(allPass ? PASS_GREEN : FAIL_RED),
          textColor: hex(allPass ? PASS_TEXT : FAIL_TEXT),
          halign: 'center',
        },
      } as CellInput,
    ] as RowInput);

    // One row per property check
    for (const pr of vr.results) {
      const statusBg   = pr.passed ? PASS_GREEN : FAIL_RED;
      const statusText = pr.passed ? PASS_TEXT  : FAIL_TEXT;

      tableRows.push([
        { content: '', styles: { fillColor: hex('#ffffff') } },
        { content: pr.state !== 'default' ? `:${pr.state}` : '', styles: { fillColor: hex('#ffffff'), textColor: hex('#7c3aed'), fontStyle: 'italic' } },
        { content: pr.property, styles: { fillColor: hex('#ffffff'), font: 'courier', fontSize: 8 } },
        { content: pr.expected, styles: { fillColor: hex('#ffffff'), font: 'courier', fontSize: 8 } },
        { content: pr.actual || '—', styles: { fillColor: hex('#ffffff'), font: 'courier', fontSize: 8 } },
        {
          content: pr.passed ? 'PASS' : 'FAIL',
          styles: {
            fillColor: hex(statusBg),
            textColor: hex(statusText),
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 8,
          },
        },
      ]);
    }
  }

  const colWidths = [36, 18, 36, 32, 32, 16];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Component', 'State', 'Property', 'Expected', 'Actual', 'Status']],
    body: tableRows,
    headStyles: {
      fillColor: hex(HEADER_BG),
      textColor: hex(HEADER_TEXT),
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: hex(BORDER_COLOR),
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: colWidths[0] },
      1: { cellWidth: colWidths[1] },
      2: { cellWidth: colWidths[2] },
      3: { cellWidth: colWidths[3] },
      4: { cellWidth: colWidths[4] },
      5: { cellWidth: colWidths[5] },
    },
    theme: 'grid',
    // Page-break safety
    pageBreak: 'auto',
    rowPageBreak: 'auto',
    // Add branded page header on every new page
    didDrawPage: (data) => {
      addPageHeader(doc, (data.pageNumber ?? 1));
    },
  });

  // ── Footer on last page ─────────────────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated by UI Kitchen Sink · ${scannedAt.toLocaleDateString()}`,
      margin,
      pageH - 6,
    );
    doc.text(`${i} / ${totalPages}`, pageW - margin, pageH - 6, { align: 'right' });
  }

  // ── Trigger download ────────────────────────────────────────────────────────
  const dateStr = scannedAt.toISOString().split('T')[0];
  const safeName = profileName.replace(/[^a-z0-9_\- ]/gi, '_').trim();
  doc.save(`Audit_Report_${safeName}_${dateStr}.pdf`);
}
