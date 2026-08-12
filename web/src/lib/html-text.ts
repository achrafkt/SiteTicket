// Comments written before the rich-text composer existed are stored as
// plain text and may coincidentally contain '<' or '&'. Only render via
// dangerouslySetInnerHTML when the body actually looks like markup produced
// by the composer — everything else stays on the safe plain-text path.
const HTML_TAG_PATTERN = /<\/?(p|br|b|strong|i|em|u|a|img|div|span|ul|ol|li)(\s|>|\/)/i;

export function looksLikeRichTextHtml(value: string): boolean {
  return HTML_TAG_PATTERN.test(value);
}

// Converts rich-text comment HTML into a plain-text preview. Regex-based
// (not DOMParser) so it also works if this ever runs outside the browser.
export function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}
