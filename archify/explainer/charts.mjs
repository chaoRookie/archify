import { PeleError, detectType, register, render } from './vendor/pele/core.js';
import pie from './vendor/pele/diagrams/pie.js';
import xychart from './vendor/pele/diagrams/xychart.js';
import quadrantChart from './vendor/pele/diagrams/quadrantChart.js';
import sankey from './vendor/pele/diagrams/sankey.js';
import radar from './vendor/pele/diagrams/radar.js';
import venn from './vendor/pele/diagrams/venn.js';

register(pie, xychart, quadrantChart, sankey, radar, venn);

const NATIVE = { flowchart: 'workflow or architecture', sequence: 'sequence', class: 'class', er: 'erd', state: 'lifecycle', timeline: 'timeline', gantt: 'timeline or waterfall', mindmap: 'tree', treeview: 'tree' };

// A pie legend reads "Label · value (share%)" rather than Pele's "Label [value]". The labels are
// rewritten before rendering so the legend is laid out for their real width.
function pieLegend(text) {
  if (!/^\s*pie\b/u.test(text)) return text;
  const slice = /^(\s*)"((?:[^"\\]|\\.)*)"\s*:\s*(-?\d+(?:\.\d+)?)\s*$/gmu;
  const total = [...text.matchAll(slice)].reduce((sum, match) => sum + Number(match[3]), 0);
  if (!(total > 0)) return text;
  return text.replace(/^(\s*pie)\s+showData\b/u, '$1').replace(slice, (_, indent, label, value) => { const share = Math.round(Number(value) / total * 100); return `${indent}"${label} · ${value}${/\p{Script=Han}/u.test(label) ? `（${share}%）` : ` (${share}%)`}" : ${value}`; });
}

/** Render a Mermaid chart to static SVG, or return a located diagnostic reason. */
export function compileExplainerChart(text) {
  const type = detectType(text);
  if (type && NATIVE[type]) return { category: 'capability-limit', error: `Mermaid ${type} is drawn with the native ${NATIVE[type]} shorthand, which Archify validates and lets readers explore.`, example: `@${NATIVE[type].split(' ')[0]} id=...` };
  try {
    const result = render(pieLegend(text), { padding: 8, fontSize: 13, links: false, images: false, config: { xyChart: { width: 480, height: 260, showDataLabel: true }, quadrantChart: { chartWidth: 400, chartHeight: 400 } } });
    // A rotated CJK axis title lies on its side; vertical writing keeps the characters upright.
    const svg = result.svg.replace(/<g transform="translate\(([\d.-]+),([\d.-]+)\) rotate\(-90\)"><text x="0" y="[\d.-]+" text-anchor="middle">([^<]*\p{Script=Han}[^<]*)<\/text><\/g>/gu, (_, x, y, label) => `<text x="${x}" y="${y}" text-anchor="middle" writing-mode="vertical-rl">${label}</text>`);
    return { svg, width: result.width, height: result.height, type: result.type };
  } catch (error) {
    if (!(error instanceof PeleError)) throw error;
    const supported = 'pie, xychart-beta (bar and line), quadrantChart, sankey-beta, radar-beta or venn-beta';
    return { category: error.code === 'unsupported-diagram' ? 'capability-limit' : 'fact-error', error: error.code === 'unsupported-diagram' ? `A chart fence supports ${supported}.` : error.message.split('\n')[0], line: error.line, example: 'pie title Share\n  "A" : 60\n  "B" : 40' };
  }
}

export function chartFromData(bytes, filePath, { kind, x, y, unit }) {
  let rows;
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/u, '');
  if (/\.json$/iu.test(filePath)) {
    try { rows = JSON.parse(text); } catch { return { error: 'The data file is not valid JSON.' }; }
    if (!Array.isArray(rows) || !rows.every(row => row && typeof row === 'object' && !Array.isArray(row))) return { error: 'JSON chart data must be an array of objects.' };
  } else {
    function cells(line) {
      const fields = [];
      const pattern = /(?:"((?:[^"]|"")*)"|([^",]*))(,|$)/gyu;
      for (;;) {
        const field = pattern.exec(line);
        if (!field) return null;
        fields.push(field[1] === undefined ? field[2].trim() : field[1].replaceAll('""', '"'));
        if (!field[3]) return fields;
      }
    }
    const lines = text.split(/\r?\n/u).filter(line => line.trim());
    if (lines.length < 2) return { error: 'CSV chart data needs a header row and at least one data row.' };
    const header = cells(lines[0]);
    if (!header) return {error: 'Invalid CSV quoting in the header.'};
    if (new Set(header).size !== header.length || header.includes('')) return {error: 'CSV column names must be nonempty and unique.'};
    rows = [];
    for (const [index, line] of lines.slice(1).entries()) {
      const values = cells(line);
      if (!values) return {category: 'capability-limit', error: `Cannot read CSV data row ${index + 1} as a single record. Check its quoting or use a JSON array to preserve multiline values.`};
      if (values.length !== header.length) return {error: `CSV data row ${index + 1} has ${values.length} cells for ${header.length} columns.`};
      rows.push(Object.fromEntries(header.map((name, i) => [name, values[i]])));
    }
  }
  const columns = new Set(rows.flatMap(row => Object.keys(row)));
  const missing = [x, ...y].find(column => !columns.has(column));
  if (missing) return { error: `The data file has no column "${missing}". Columns: ${[...columns].join(', ')}.` };
  if (kind === 'pie' && y.length !== 1) return {category: 'capability-limit', error: 'A pie chart displays one series. Use a bar chart or separate pies to display every requested series.'};
  if (rows.length > (kind === 'pie' ? 12 : 60)) return { category: 'capability-limit', error: `A ${kind} chart takes at most ${kind === 'pie' ? 12 : 60} rows; this file has ${rows.length}. Split the chart or use a table that includes every row.` };
  const blank = value => value === undefined || value === null || String(value).trim() === '';
  const missingLabel = rows.findIndex(row => blank(row[x]));
  if (missingLabel >= 0) return {error: `Column "${x}" is empty in data row ${missingLabel + 1}. Supply its recorded label or use a table marking it unknown.`};
  const labels = [...rows.map(row => row[x]), ...y, unit || ''];
  if (labels.some(label => typeof label !== 'number' && typeof label !== 'string')) return {error: 'Chart labels must be text or numbers. Use a table for structured values.'};
  if (labels.some(label => /["\\\r\n]/u.test(String(label)))) return {category: 'capability-limit', error: 'The chart format cannot display a label containing a quote, backslash or line break verbatim. Use a table to preserve its text.'};
  const quote = value => `"${value}"`;
  const numbers = column => rows.map(row => {
    const value = row[column];
    if (typeof value === 'number') return value;
    if (typeof value !== 'string' || !/^[+-]?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(value.trim())) return NaN;
    return Number(value.replaceAll(',', ''));
  });
  for (const column of y) {
    const bad = numbers(column).findIndex(value => !Number.isFinite(value));
    if (bad < 0) continue;
    if (blank(rows[bad][column])) return { error: `Column "${column}" is empty in data row ${bad + 1}. A blank is missing data, not zero: supply the recorded value or use a table marking it missing.` };
    return { error: `Column "${column}" has a non-numeric value in data row ${bad + 1}: ${rows[bad][column]}.` };
  }
  if (kind === 'pie') { const values = numbers(y[0]); return { text: `pie\n${rows.map((row, i) => `  ${quote(row[x])} : ${values[i]}`).join('\n')}` }; }
  return { text: `xychart-beta\n  x-axis [${rows.map(row => quote(row[x])).join(', ')}]\n${unit ? `  y-axis ${quote(unit)}\n` : ''}${y.map(column => `  ${kind} ${quote(column)} [${numbers(column).join(', ')}]`).join('\n')}` };
}
