import * as validators from './generated-validators.mjs';
import { throwDiagnosticError } from './diagnostics.mjs';

// "/nodes/3/label" reads much better as "/nodes/3 (id: "router") /label" for the
// LLM fixing the JSON; resolve the nearest enclosing element's id or label.
function annotatedPath(instancePath, data) {
  if (!instancePath) return { path: '/', identity: null };
  let node = data;
  let hint = null;
  for (const seg of instancePath.split('/').slice(1)) {
    if (node == null || typeof node !== 'object') break;
    node = node[/^\d+$/.test(seg) ? Number(seg) : seg];
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      const tag = node.id ?? node.label;
      if (tag != null) hint = String(tag);
    }
  }
  return { path: instancePath, identity: hint };
}

function annotatePath(instancePath, data) {
  const annotated = annotatedPath(instancePath, data);
  return annotated.identity != null
    ? `${annotated.path} (id/label: ${JSON.stringify(annotated.identity)})`
    : annotated.path;
}

function formatErrors(errors, data) {
  return errors.map((e) => {
    const where = annotatePath(e.instancePath, data);
    const detail = e.params && Object.keys(e.params).length
      ? ' ' + JSON.stringify(e.params)
      : '';
    return `  ${where} ${e.message}${detail}`;
  }).join('\n');
}

export function validCalendarDate(timestamp) {
  const [year, month, day] = timestamp.slice(0, 10).split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}
function partialTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?)?$/u.test(value)) return false;
  return validCalendarDate(value);
}

export function validateSchema(diagramType, data) {
  const validate = validators[diagramType];
  if (!validate) {
    throw new Error(`validateSchema: unknown diagram type "${diagramType}"`);
  }
  if (!validate(data)) {
    const diagnostics = validate.errors.map((error) => {
      const annotated = annotatedPath(error.instancePath, data);
      const subject = {
        diagramType,
        path: annotated.path,
        ...(annotated.identity != null ? { identity: String(annotated.identity) } : {}),
      };
      const evidence = {
        keyword: error.keyword,
        expected: error.schema,
        ...error.params,
      };
      const capacity = (error.keyword === 'maxItems' && !/\/(?:pos|size|via|viewBox|route|lines)(?:\/\d+)?$/u.test(annotated.path))
        || (error.keyword === 'maximum' && diagramType === 'workflow' && /\/(col|fromCol|toCol)$/u.test(annotated.path))
        || (error.keyword === 'maxLength' && !annotated.path.endsWith('/id'));
      const tooFewForView = error.keyword === 'minItems' && (
        (diagramType === 'dataflow' && ['/stages', '/nodes'].includes(annotated.path))
        || (diagramType === 'sequence' && annotated.path === '/participants')
      );
      const partialTime = diagramType === 'timeline' && error.keyword === 'pattern' && /^\/events\/\d+\/at$/u.test(annotated.path)
        && partialTimestamp(data.events[Number(annotated.path.split('/')[2])].at);
      const supportedFixes = partialTime ? ['Keep the date at its recorded precision in a dated list or table, or supply a verified timestamp with an offset.']
        : tooFewForView ? ['Show the recorded items in an ordered list or another view that supports this count.']
        : capacity ? ['Split or layer the view, or use a representation that can display the complete input with its relationships.']
        : {
        additionalProperties: [`represent the value in a supported field or accompanying note instead of unsupported property ${JSON.stringify(error.params?.additionalProperty)}`],
        required: [`add required property ${JSON.stringify(error.params?.missingProperty)}`],
        type: [`use ${JSON.stringify(error.params?.type)} at ${annotated.path}`],
        enum: [`choose one of the allowed values`],
        pattern: [`match the required pattern ${JSON.stringify(error.params?.pattern)}`],
        minimum: [`verify the source and unit for the required bound ${error.params?.comparison || '>='} ${error.params?.limit}`],
        maximum: [`verify the source and unit for the required bound ${error.params?.comparison || '<='} ${error.params?.limit}`],
        minItems: [`provide at least ${error.params?.limit} item(s)`],
        maxItems: [`provide at most ${error.params?.limit} item(s)`],
        minLength: [`provide at least ${error.params?.limit} character(s)`],
        maxLength: [`provide at most ${error.params?.limit} character(s)`],
      }[error.keyword] || [];
      return {
        category: capacity || tooFewForView || partialTime ? 'capability-limit' : 'fact-error',
        code: `schema/${error.keyword}`,
        severity: 'error',
        message: `${annotatePath(error.instancePath, data)} ${error.message}`,
        subject,
        evidence,
        supportedFixes,
      };
    });
    throwDiagnosticError(
      `${diagramType} schema validation failed:\n${formatErrors(validate.errors, data)}`,
      diagnostics,
    );
  }
}
