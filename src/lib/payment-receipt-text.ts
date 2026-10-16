/** Conservative extraction: never treat a date, reference, fee or account balance as a transfer amount. */
export function normalizeReceiptText(text: string) {
  return text.replace(/[٠-٩۰-۹]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.includes(digit) ? '٠١٢٣٤٥٦٧٨٩'.indexOf(digit) : '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/٬/g, ',').replace(/٫/g, '.').replace(/[−–—]/g, '-').replace(/[\u200e\u200f\u202a-\u202e]/g, '');
}

function amounts(line: string) {
  return [...line.matchAll(/-?\s*\d[\d,.]*/g)].flatMap(match => {
    let raw = match[0].replace(/[,.]+$/, '');
    raw = raw.trim();
    if (raw.startsWith('-')) return [];
    if (!raw || raw.length > 13) return [];
    const lastDot = raw.lastIndexOf('.'), lastComma = raw.lastIndexOf(',');
    const separator = Math.max(lastDot, lastComma);
    if (separator >= 0 && raw.length - separator - 1 === 2) {
      const integer = raw.slice(0, separator), decimal = raw[separator];
      if (integer.includes(decimal) || (!/^\d+$/.test(integer) && !/^\d{1,3}([,.]\d{3})+$/.test(integer))) return [];
      raw = integer.replace(/[,.]/g, '') + '.' + raw.slice(separator + 1);
    }
    else if (/^\d{1,3}([,.]\d{3})+$/.test(raw)) raw = raw.replace(/[,.]/g, '');
    else if (/[,.]/.test(raw)) return [];
    const value = Number(raw);
    return value > 0 && value <= 1000000 ? [value] : [];
  });
}

export function readReceiptAmount(text: string): { amount: number | null; reason?: string } {
  const normalized = normalizeReceiptText(text).toLowerCase();
  if (/\b(failed|declined|cancelled|canceled|pending|unsuccessful)\b|قيد التنفيذ|فشل|لم تتم|غير ناجح|ملغ/.test(normalized)) return { amount: null, reason: 'The screenshot does not show a completed transfer.' };
  if (/\b(?:usd|eur|gbp|aed|sar|kwd|qar|dollars?|euros?)\b|دولار|ريال|درهم|دينار/.test(normalized)) return { amount: null, reason: 'Upload the transaction in Egyptian pounds (EGP).' };
  const lines = normalized.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const excluded = /fee|charge|balance|reference|transaction\s*(id|number|no)|phone|mobile|date|رسوم|رصيد|مرجع|تاريخ|هاتف/;
  const amountLabel = /(?:transfer|transaction|sent|payment)\s*amount|amount\s*(?:sent|transferred)?|مبلغ التحويل|المبلغ المحول|قيمة التحويل|المبلغ/;
  const currency = /\begp\b|\bl[. ]?e\b|ج\s*[.]?\s*م(?:\s|$|[.,])|جنيه/;
  const candidates: { amount: number; rank: number }[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const followsExcludedLabel = index > 0 && excluded.test(lines[index - 1]) && !/\d/.test(lines[index - 1]);
    if (excluded.test(line) || (followsExcludedLabel && !amountLabel.test(line))) continue;
    if (amountLabel.test(line)) {
      let found = amounts(line);
      if (!found.length && lines[index + 1] && !excluded.test(lines[index + 1])) found = amounts(lines[index + 1]);
      const context = lines.slice(Math.max(0, index - 1), index + 3).filter(value => !excluded.test(value)).join(' ');
      if (found.length === 1 && currency.test(context)) candidates.push({ amount: found[0], rank: 2 });
    } else if (currency.test(line)) {
      let found = amounts(line);
      if (!found.length && lines[index + 1] && !excluded.test(lines[index + 1])) found = amounts(lines[index + 1]);
      if (found.length === 1) candidates.push({ amount: found[0], rank: 1 });
    }
  }
  const rank = Math.max(0, ...candidates.map(candidate => candidate.rank));
  const unique = [...new Set(candidates.filter(candidate => candidate.rank === rank).map(candidate => candidate.amount))];
  if (unique.length !== 1) return { amount: null, reason: unique.length ? 'More than one transfer amount is visible. Upload the single transaction confirmation.' : 'The transfer amount could not be read. Upload a clear, uncropped confirmation with the amount and EGP visible.' };
  return { amount: unique[0] };
}
