import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { AUTHORS, PEOPLE, PERSON_IDS, Scenario, TransferSource } from '../types';
import { computeBalances } from './balances';
import { fairnessScore, maxDeviation, sumAbsDeviation } from './fairness';
import { formatEuro, formatEuroCompact, formatPercent, formatSignedEuro } from './format';

const DISCLAIMER =
  'Correction values are optional assumptions, not legal facts. Verify with a notary or tax adviser before signing.';

const SOURCE_LABEL: Record<NonNullable<TransferSource>, string> = {
  lisa: 'Lisa',
  vicky: 'Vicky',
  jackie: 'Jackie',
  alexa: 'Alexa',
  mum: 'Mum',
  dad: 'Dad',
  mum_and_dad: 'Mum & Dad',
};

/**
 * Renders the active scenario as a PDF that visually mirrors the on-screen
 * cards. We capture two parts of the live DOM with html2canvas — the sticky
 * balance bar and the asset list — and stack them as images in the PDF.
 * Tables for transfers / corrections / notes are appended afterward.
 *
 * Falls back to a programmatic table-only layout if html2canvas is unable to
 * find the DOM nodes (e.g. the user opened the page, never scrolled, then
 * triggered an export from a stale state).
 */
export async function exportScenarioPDF(scenario: Scenario): Promise<void> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 32;

  let y = margin;

  // Header
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text(scenario.name, margin, y);
  y += 18;
  doc.setFontSize(10);
  doc.setTextColor(120);
  const author = AUTHORS.find((a) => a.id === scenario.author)?.name ?? scenario.author;
  const meeting = scenario.meeting ? ` · Meeting: ${scenario.meeting}` : '';
  const created = new Date(scenario.createdAt).toLocaleDateString('en-CH');
  const updated = new Date(scenario.updatedAt).toLocaleDateString('en-CH');
  doc.text(
    `Author: ${author}${meeting} · Status: ${statusLabel(scenario.status)} · Created ${created} · Updated ${updated}`,
    margin,
    y
  );
  y += 14;

  // Try to capture the live DOM for the visually-rich top section.
  const balanceImg = await captureNode('[data-pdf-capture="balance-bar"]');
  const assetsImg = await captureNode('[data-pdf-capture="asset-list"]');

  if (balanceImg) {
    y = ensureSpace(doc, y, balanceImg.heightPt(pageWidth - margin * 2), margin);
    const w = pageWidth - margin * 2;
    const h = balanceImg.heightPt(w);
    doc.addImage(balanceImg.dataUrl, 'PNG', margin, y, w, h);
    y += h + 12;
  }

  if (assetsImg) {
    const w = pageWidth - margin * 2;
    const fullH = assetsImg.heightPt(w);
    const maxPerPage = pageHeight - margin * 2;
    const slices = await sliceImageVertically(assetsImg, w, maxPerPage);
    for (let i = 0; i < slices.length; i++) {
      if (i > 0) {
        doc.addPage();
        y = margin;
      } else if (y + slices[i].heightPt > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.addImage(slices[i].dataUrl, 'PNG', margin, y, w, slices[i].heightPt);
      y += slices[i].heightPt + 12;
    }
    void fullH;
  } else {
    // Fallback: programmatic asset table (no images).
    y = ensureSpace(doc, y, 50, margin);
    autoTable(doc, {
      startY: y,
      head: [
        ['Asset', 'Total value', ...PEOPLE.flatMap((p) => [p.name + ' %', p.name + ' €'])],
      ],
      body: scenario.assets.map((a) => [
        a.name,
        formatEuro(a.totalValue),
        ...PERSON_IDS.flatMap((pid) => [
          formatPercent(a.allocations[pid] ?? 0),
          formatEuro((a.totalValue * (a.allocations[pid] ?? 0)) / 100),
        ]),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [60, 70, 90] },
      margin: { left: margin, right: margin },
    });
    y = (doc as DocWithLastTable).lastAutoTable.finalY + 12;
  }

  // Per-person final balance — programmatic for clarity even if we already
  // have the sticky bar as an image.
  const balances = computeBalances(scenario);
  y = ensureSpace(doc, y, 80, margin);
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text('Final balance', margin, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    head: [['Person', 'Assets', 'Payments', 'Corrections', 'Total', 'Δ vs Goal']],
    body: PEOPLE.map((p) => [
      p.name,
      formatEuro(balances.perPersonAsset[p.id]),
      formatSignedEuro(balances.perPersonTransfer[p.id]),
      formatSignedEuro(balances.perPersonCorrection[p.id]),
      formatEuro(balances.perPerson[p.id]),
      formatSignedEuro(balances.diff[p.id]),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [60, 70, 90] },
    margin: { left: margin, right: margin },
  });
  y = (doc as DocWithLastTable).lastAutoTable.finalY + 14;

  // Transfers
  if (scenario.transfers.length > 0) {
    y = ensureSpace(doc, y, 60, margin);
    doc.setFontSize(12);
    doc.text('Direct payments', margin, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Description', 'From', 'To', 'Amount']],
      body: scenario.transfers.map((t) => [
        t.name,
        sourceLabel(t.from),
        labelOf(t.to),
        formatEuro(t.amount),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [60, 70, 90] },
      margin: { left: margin, right: margin },
    });
    y = (doc as DocWithLastTable).lastAutoTable.finalY + 14;
  }

  // Active corrections
  const activeCorrections = scenario.corrections.filter((c) => c.active && c.amount !== 0);
  if (activeCorrections.length > 0) {
    y = ensureSpace(doc, y, 60, margin);
    doc.setFontSize(12);
    doc.text('Active corrections', margin, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Person', 'Note', 'Amount']],
      body: activeCorrections.map((c) => [labelOf(c.person), c.note, formatEuro(c.amount)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [60, 70, 90] },
      margin: { left: margin, right: margin },
    });
    y = (doc as DocWithLastTable).lastAutoTable.finalY + 14;
  }

  // Notes & assumptions
  if (scenario.notes || scenario.assumptions) {
    y = ensureSpace(doc, y, 80, margin);
    doc.setFontSize(12);
    doc.text('Notes & assumptions', margin, y);
    y += 12;
    doc.setFontSize(10);
    if (scenario.notes) {
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', margin, y);
      doc.setFont('helvetica', 'normal');
      y = drawWrapped(doc, scenario.notes, margin + 50, y, pageWidth - margin * 2 - 50) + 6;
    }
    if (scenario.assumptions) {
      doc.setFont('helvetica', 'bold');
      doc.text('Assumptions:', margin, y);
      doc.setFont('helvetica', 'normal');
      y = drawWrapped(doc, scenario.assumptions, margin + 50, y, pageWidth - margin * 2 - 50) + 6;
    }
  }

  // Summary footer (last page)
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Pool ${formatEuroCompact(balances.estatePool)} · Goal ${formatEuroCompact(balances.equalTarget)} · max Δ ${formatEuroCompact(maxDeviation(balances))} · Σ|Δ| ${formatEuroCompact(sumAbsDeviation(balances))} · Fairness ${fairnessScore(balances)}/100`,
    margin,
    pageHeight - 32
  );
  // Disclaimer footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(DISCLAIMER, margin, pageHeight - 16, {
      maxWidth: pageWidth - margin * 2,
    });
  }

  doc.save(`${slug(scenario.name)}.pdf`);
}

export async function exportComparePDF(scenarios: Scenario[]): Promise<void> {
  if (scenarios.length === 0) return;
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
  const margin = 32;
  let y = margin;

  doc.setFontSize(16);
  doc.text('Inheritance — Comparison', margin, y);
  y += 18;

  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(new Date().toLocaleDateString('en-CH'), margin, y);
  y += 14;
  doc.setTextColor(20);

  const data = scenarios.map((sc) => ({ sc, b: computeBalances(sc) }));
  const head = [
    ' ',
    ...data.map((d) => `${d.sc.name}${d.sc.status === 'final' ? ' ✓' : d.sc.status === 'preferred' ? ' ★' : ''}`),
  ];

  const body: string[][] = [];
  for (const p of PEOPLE) {
    body.push([
      p.name,
      ...data.map(
        (d) =>
          `${formatEuro(d.b.perPerson[p.id])}  (${formatSignedEuro(d.b.diff[p.id])})`
      ),
    ]);
  }
  body.push(['Goal', ...data.map((d) => formatEuro(d.b.equalTarget))]);
  body.push(['max Δ', ...data.map((d) => formatEuro(maxDeviation(d.b)))]);
  body.push(['Σ |Δ|', ...data.map((d) => formatEuro(sumAbsDeviation(d.b)))]);
  body.push(['Fairness', ...data.map((d) => `${fairnessScore(d.b)}/100`)]);

  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [60, 70, 90] },
    margin: { left: margin, right: margin },
  });

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(DISCLAIMER, margin, doc.internal.pageSize.getHeight() - 20, {
    maxWidth: doc.internal.pageSize.getWidth() - margin * 2,
  });

  doc.save('comparison.pdf');
}

interface CapturedImage {
  dataUrl: string;
  widthPx: number;
  heightPx: number;
  heightPt: (widthPt: number) => number;
}

/**
 * Splits a captured image into a sequence of slices, each fitting within
 * `maxHeightPt` when displayed at width `widthPt`. Slicing happens on an
 * offscreen canvas in pixel space.
 */
async function sliceImageVertically(
  img: CapturedImage,
  widthPt: number,
  maxHeightPt: number
): Promise<Array<{ dataUrl: string; heightPt: number }>> {
  const totalHeightPt = img.heightPt(widthPt);
  if (totalHeightPt <= maxHeightPt) {
    return [{ dataUrl: img.dataUrl, heightPt: totalHeightPt }];
  }
  // Convert to pixel space using the image's own scale.
  const ptToPx = img.widthPx / widthPt;
  const slicePxHeight = Math.floor(maxHeightPt * ptToPx);
  const out: Array<{ dataUrl: string; heightPt: number }> = [];
  const sourceImg = await loadImage(img.dataUrl);
  let pxY = 0;
  while (pxY < img.heightPx) {
    const remainPx = img.heightPx - pxY;
    const cutPx = Math.min(slicePxHeight, remainPx);
    const canvas = document.createElement('canvas');
    canvas.width = img.widthPx;
    canvas.height = cutPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) break;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sourceImg, 0, pxY, img.widthPx, cutPx, 0, 0, img.widthPx, cutPx);
    out.push({
      dataUrl: canvas.toDataURL('image/png'),
      heightPt: cutPx / ptToPx,
    });
    pxY += cutPx;
  }
  return out;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function captureNode(selector: string): Promise<CapturedImage | null> {
  if (typeof document === 'undefined') return null;
  const node = document.querySelector(selector) as HTMLElement | null;
  if (!node) return null;
  try {
    const canvas = await html2canvas(node, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      windowWidth: Math.max(node.scrollWidth, 800),
    });
    const dataUrl = canvas.toDataURL('image/png');
    const widthPx = canvas.width;
    const heightPx = canvas.height;
    return {
      dataUrl,
      widthPx,
      heightPx,
      heightPt: (widthPt: number) => (widthPt * heightPx) / widthPx,
    };
  } catch {
    return null;
  }
}

function ensureSpace(doc: jsPDF, y: number, needed: number, margin: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - margin) {
    doc.addPage();
    return margin;
  }
  return y;
}

function labelOf(id: string): string {
  return PEOPLE.find((p) => p.id === id)?.name ?? id;
}

function sourceLabel(from: TransferSource): string {
  if (!from) return 'Mum & Dad';
  return SOURCE_LABEL[from];
}

function statusLabel(s: string): string {
  if (s === 'preferred') return 'Preferred';
  if (s === 'final') return 'Final';
  return 'Draft';
}

function slug(s: string): string {
  return (
    s
      .normalize('NFKD')
      .replace(/[^\w]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'scenario'
  );
}

function drawWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * 12;
}

interface DocWithLastTable extends jsPDF {
  lastAutoTable: { finalY: number };
}
