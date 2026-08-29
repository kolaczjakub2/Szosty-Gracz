const SINGLE_LETTER_WORD = /(^|[\s(„“"'])(([aiouwz]))\s+/gi;

export function preventPolishOrphans(text: string): string {
  return text.replace(SINGLE_LETTER_WORD, '$1$2\u00a0');
}

export function preventPolishOrphansInHtml(html: string): string {
  return html
    .split(/(<[^>]+>)/g)
    .map((part) => (part.startsWith('<') ? part : preventPolishOrphans(part)))
    .join('');
}
