import jsPDF from 'jspdf';
import type { StatsBundle } from '../services/mock';

// Which KPIs the user ticked to include.
export type ReportSelection = {
  reussite: boolean;
  rondes: boolean;
  incidents: boolean;
  cycles: boolean;
  distance: boolean;
  disponibilite: boolean;
};

export interface ReportSpec {
  robotName: string;
  robotId: string;
  periodLabel: string;
  bundle: StatsBundle; // daily-granularity stats — SAME source as the dashboard
  selection: ReportSelection;
  format: 'csv' | 'pdf';
}

// Summary KPI rows for the selected content. Values come straight from the
// stats bundle, so the report matches the dashboard/Statistiques for the period.
function summaryRows(b: StatsBundle, sel: ReportSelection): string[][] {
  const s = b.summary;
  const rows: string[][] = [];
  if (sel.reussite) rows.push(['Taux de réussite des missions', `${s.missionRate}%`, `${s.completed} / ${s.total}`]);
  if (sel.rondes) rows.push(['Rondes terminées', `${s.completed}`, `sur ${s.total} totales`]);
  if (sel.incidents) rows.push(["Arrêts d'urgence", `${s.emergencyStops}`, '']);
  if (sel.cycles) rows.push(['Cycles de charge', `${s.dockingSucc}`, `taux ${s.dockingRate}%`]);
  if (sel.distance) rows.push(['Distance totale', `${s.distanceKm} km`, '']);
  if (sel.disponibilite) rows.push(['Disponibilité', 'à venir', 'formule à définir (TODO)']);
  return rows;
}

// Daily-table columns available per day (cycles/disponibilité are summary-only).
function dailyTable(b: StatsBundle, sel: ReportSelection): { header: string[]; rows: string[][] } {
  const header = ['Date'];
  if (sel.rondes) header.push('Rondes terminées', 'Interrompues');
  if (sel.incidents) header.push('Incidents');
  if (sel.distance) header.push('Distance (km)');

  const rows = b.roundsSuccess.map((rs, i) => {
    const row = [rs.label];
    if (sel.rondes) row.push(String(rs.completed), String(rs.interrupted));
    if (sel.incidents) row.push(String(b.emergency[i].value));
    if (sel.distance) row.push(String(b.distance[i].value));
    return row;
  });
  return { header, rows };
}

const fileName = (spec: ReportSpec) =>
  `pguard_${spec.robotId}_${spec.periodLabel.replace(/\s+/g, '-').toLowerCase()}.${spec.format}`;

// CSV — built entirely client-side from the bundle, then downloaded via a Blob.
function buildCsv(spec: ReportSpec): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const L: string[] = [];
  L.push('P-Guard Monitor — Rapport');
  L.push(`Robot,${esc(`${spec.robotName} (${spec.robotId})`)}`);
  L.push(`Période,${esc(spec.periodLabel)}`);
  L.push(`Généré le,${esc(new Date().toLocaleString('fr-FR'))}`);
  L.push('');
  L.push('Résumé');
  for (const r of summaryRows(spec.bundle, spec.selection)) L.push(r.map(esc).join(','));
  const { header, rows } = dailyTable(spec.bundle, spec.selection);
  if (header.length > 1) {
    L.push('');
    L.push('Détail quotidien');
    L.push(header.map(esc).join(','));
    for (const row of rows) L.push(row.map(esc).join(','));
  }
  return L.join('\n');
}

function downloadBlob(content: BlobPart, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// PDF — a modest report via jsPDF: header + summary KPIs + a simple daily table
// with page breaks. Not pixel-perfect by design.
function buildPdf(spec: ReportSpec) {
  const doc = new jsPDF();
  let y = 18;
  doc.setFontSize(16);
  doc.text('P-Guard Monitor — Rapport', 14, y);
  y += 9;
  doc.setFontSize(11);
  doc.text(`Robot : ${spec.robotName} (${spec.robotId})`, 14, y);
  y += 6;
  doc.text(`Période : ${spec.periodLabel}`, 14, y);
  y += 6;
  doc.text(`Généré le : ${new Date().toLocaleString('fr-FR')}`, 14, y);
  y += 11;

  doc.setFontSize(13);
  doc.text('Résumé', 14, y);
  y += 7;
  doc.setFontSize(11);
  for (const r of summaryRows(spec.bundle, spec.selection)) {
    doc.text(`${r[0]} : ${r[1]}${r[2] ? ` (${r[2]})` : ''}`, 16, y);
    y += 6;
  }

  const { header, rows } = dailyTable(spec.bundle, spec.selection);
  if (header.length > 1) {
    y += 5;
    doc.setFontSize(13);
    doc.text('Détail quotidien', 14, y);
    y += 7;
    doc.setFontSize(9);
    const colW = 170 / header.length;
    const drawRow = (cells: string[], bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      cells.forEach((c, i) => doc.text(c, 16 + i * colW, y));
      y += 5;
      if (y > 285) {
        doc.addPage();
        y = 18;
      }
    };
    drawRow(header, true);
    for (const row of rows) drawRow(row);
  }

  doc.save(fileName(spec));
}

// Entry point: generate + download the report in the chosen format.
export function generateReport(spec: ReportSpec) {
  if (spec.format === 'csv') {
    downloadBlob(buildCsv(spec), 'text/csv;charset=utf-8', fileName(spec));
  } else {
    buildPdf(spec);
  }
}
