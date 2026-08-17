import DOMPurify from 'dompurify';

// Mirrors backend/src/common/sanitize-comment-html.ts. The backend is the
// source of truth (it re-sanitizes on write regardless of what the client
// sends); this is defense-in-depth before dangerouslySetInnerHTML renders a
// comment body that may have been produced by another user.
const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 'a', 'img', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li'];
const ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'style', 'data-mention-user-id'];

export function sanitizeCommentHtmlForRender(html: string): string {
  if (typeof window === 'undefined') {
    // DOMPurify needs a DOM; on the server the value is re-sanitized again
    // client-side on hydration before it's ever trusted for markup.
    return '';
  }

  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
