import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PEOPLE, PERSON_IDS, Scenario } from '../types';
import { computeBalances } from './balances';
import { fairnessScore, maxDeviation, sumAbsDeviation } from './fairness';
import { formatEuro, formatPercent, formatSignedEuro } from './format';

const DISCLAIMER =
  'Die Korrekturwerte sind optionale Annahmen, keine rechtlichen Tatsachen. Vor Unterzeichnung mit Notar/Steuerberatung prüfen.';

export function exportScenarioPDF(scenario: Scenario): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;
  let y = margin;

  doc.setFontSize(16);
  doc.text(`Erbteilung – ${scenario.name}`, margin, y);
  y += 22;

  doc.setFontSize(10);
  doc.setTextColor(120);
  const created = new Date(scenario.createdAt).toLocaleDateString('de-CH');
  const updated = new Date(scenario.updatedAt).toLocaleDateString('de-CH');
  doc.text(
    `Status: ${statusLabel(scenario.status)}   Erstellt: ${created}   Aktualisiert: ${updated}`,
    margin,
    y
  );
  y += 16;

  const balances = computeBalances(scenario);
  doc.setTextColor(40);
  doc.text(
    `Pool: ${formatEuro(balances.estatePool)}   Ziel pro Person: ${formatEuro(balances.equalTarget)}   Fairness: ${fairnessScore(balances)}/100   max Δ: ${formatEuro(maxDeviation(balances))}   Σ|Δ|: ${formatEuro(sumAbsDeviation(balances))}`,
    margin,
    y
  );
  y += 18;

  // Endbilanz table
  autoTable(doc, {
    startY: y,
    head: [['Person', 'Vermögen', 'Zahlungen', 'Korrekturen', 'Total', 'Δ vs Ziel']],
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
  y = (doc as DocWithLastTable).lastAutoTable.finalY + 18;

  // Asset table
  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text('Vermögenswerte', margin, y);
  y += 10;
  autoTable(doc, {
    startY: y,
    head: [
      ['Vermögen', 'Wert', ...PEOPLE.flatMap((p) => [p.name + ' %', p.name + ' €'])],
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
  y = (doc as DocWithLastTable).lastAutoTable.finalY + 18;

  // Transfers
  if (scenario.transfers.length > 0) {
    doc.setFontSize(12);
    doc.text('Direkte Zahlungen', margin, y);
    y += 10;
    autoTable(doc, {
      startY: y,
      head: [['Bezeichnung', 'Von', 'An', 'Betrag']],
      body: scenario.transfers.map((t) => [
        t.name,
        t.from ? labelOf(t.from) : '— extern —',
        labelOf(t.to),
        formatEuro(t.amount),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [60, 70, 90] },
      margin: { left: margin, right: margin },
    });
    y = (doc as DocWithLastTable).lastAutoTable.finalY + 18;
  }

  // Active corrections
  const activeCorrections = scenario.corrections.filter((c) => c.active && c.amount !== 0);
  if (activeCorrections.length > 0) {
    doc.setFontSize(12);
    doc.text('Aktive Korrekturen', margin, y);
    y += 10;
    autoTable(doc, {
      startY: y,
      head: [['Kategorie', 'Person', 'Beschreibung', 'Betrag', 'Notiz']],
      body: activeCorrections.map((c) => [
        c.category,
        labelOf(c.person),
        c.description,
        formatEuro(c.amount),
        c.note,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [60, 70, 90] },
      margin: { left: margin, right: margin },
    });
    y = (doc as DocWithLastTable).lastAutoTable.finalY + 18;
  }

  // Constraints
  const activeConstraints = scenario.constraints.filter((c) => c.active);
  if (activeConstraints.length > 0) {
    doc.setFontSize(12);
    doc.text('Wünsche & Bedingungen', margin, y);
    y += 10;
    autoTable(doc, {
      startY: y,
      head: [['Art', 'Typ', 'Details', 'Notiz']],
      body: activeConstraints.map((c) => [
        c.kind === 'hard' ? 'Hart' : 'Weich',
        c.type,
        constraintDetails(c, scenario),
        c.note,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [60, 70, 90] },
      margin: { left: margin, right: margin },
    });
    y = (doc as DocWithLastTable).lastAutoTable.finalY + 18;
  }

  // Notes & assumptions
  if (scenario.notes || scenario.assumptions) {
    doc.setFontSize(12);
    doc.text('Notizen & Annahmen', margin, y);
    y += 14;
    doc.setFontSize(10);
    if (scenario.notes) {
      doc.setFont('helvetica', 'bold');
      doc.text('Notizen:', margin, y);
      doc.setFont('helvetica', 'normal');
      y = drawWrapped(doc, scenario.notes, margin + 60, y, pageWidth - margin * 2 - 60) + 6;
    }
    if (scenario.assumptions) {
      doc.setFont('helvetica', 'bold');
      doc.text('Annahmen:', margin, y);
      doc.setFont('helvetica', 'normal');
      y = drawWrapped(doc, scenario.assumptions, margin + 60, y, pageWidth - margin * 2 - 60) + 6;
    }
  }

  // Footer disclaimer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(DISCLAIMER, margin, doc.internal.pageSize.getHeight() - 20, {
      maxWidth: pageWidth - margin * 2,
    });
  }

  doc.save(`${slug(scenario.name)}.pdf`);
}

export function exportComparePDF(scenarios: Scenario[]): void {
  if (scenarios.length === 0) return;
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
  const margin = 36;
  let y = margin;

  doc.setFontSize(16);
  doc.text('Erbteilung – Vergleich', margin, y);
  y += 22;

  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(new Date().toLocaleDateString('de-CH'), margin, y);
  y += 16;
  doc.setTextColor(40);

  const data = scenarios.map((sc) => ({
    sc,
    b: computeBalances(sc),
  }));

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
  body.push(['Ziel', ...data.map((d) => formatEuro(d.b.equalTarget))]);
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

  doc.save('vergleich.pdf');
}

function labelOf(id: string): string {
  return PEOPLE.find((p) => p.id === id)?.name ?? id;
}

function statusLabel(s: string): string {
  if (s === 'preferred') return 'Bevorzugt';
  if (s === 'final') return 'Final';
  return 'Entwurf';
}

function slug(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'szenario';
}

function constraintDetails(c: Scenario['constraints'][number], sc: Scenario): string {
  const assetName = (id: string) => sc.assets.find((a) => a.id === id)?.name ?? id;
  switch (c.type) {
    case 'minBalance':
      return `${labelOf(c.person)} ≥ ${formatEuro(c.amount)}`;
    case 'minAssetShare':
      return `${labelOf(c.person)} ≥ ${formatPercent(c.percent)} an "${assetName(c.assetId)}"`;
    case 'fixAssetAllocation':
      return `"${assetName(c.assetId)}" fest verteilt`;
    case 'preferFullAsset':
      return `${labelOf(c.person)} bevorzugt voll an "${assetName(c.assetId)}" (Gewicht ${c.weight})`;
    case 'preferLiquidity':
      return `${labelOf(c.person)} bevorzugt Cash (Gewicht ${c.weight})`;
    case 'avoidSplitAsset':
      return `"${assetName(c.assetId)}" möglichst nicht teilen (Gewicht ${c.weight})`;
    default:
      return '';
  }
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
