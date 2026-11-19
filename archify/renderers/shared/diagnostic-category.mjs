export function categorizeDiagnostic(entry) {
  const message = String(entry.message ?? entry.code ?? 'Unknown failure');
  let category = entry.category || /^\[(fact-error|capability-limit|visual-preference)\]/u.exec(entry.message)?.[1];
  const code = entry.code || '';
  if (!category) {
    if (code.startsWith('explainer/writing-') || [
      'composition/excessive-route-detour', 'composition/micro-segment', 'composition/short-interior-segment',
      'composition/viewport-height',
    ].includes(code)) category = 'visual-preference';
    else if (code === 'layout/constraint' && /references unknown|does not name a declared|declared twice|duplicate|must be unique|requires a reference|foreign key/iu.test(entry.message)) category = 'fact-error';
    else if (entry.severity === 'warning' && code === 'composition/proper-crossing') category = 'visual-preference';
    else if (/unsupported|outside the restricted author grammar|not supported/iu.test(message) && code.startsWith('explainer/parse-')) category = 'capability-limit';
    else if (/^(?:finalize\/(?:stage-failure|invalid-receipt)|viewer\/browser-check-runtime)/u.test(code)) category = 'capability-limit';
    else if (/\/(?:invalid-|non-finite-)/u.test(code) && !code.startsWith('i18n/')) category = 'fact-error';
    else if (/(?:-(?:overlap|unplaced|too-wide|border-run|canvas-limit|readability|pin-conflict|preset-conflict|above-area|below-area|geometry-sizing))$/u.test(code)) category = 'capability-limit';
    else if (/^(?:internal|legend|composition|geometry|layout|i18n)\//u.test(code)
      || /(?:-capacity|-overflow|-unsupported|-not-drawn|-shorthand-limit|-size|-budget|crowded-|self-relationship|^explainer\/(?:source|resource)-limit)/u.test(code)) category = 'capability-limit';
    else category = 'fact-error';
  }
  const prefix = `[${category}] `;
  return {...entry, category, message: message.startsWith(prefix) ? message : prefix + message};
}
