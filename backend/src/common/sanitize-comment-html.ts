import sanitizeHtml from 'sanitize-html';

// Comment bodies come from the rich-text composer (bold/italic/underline,
// links, inline images) as HTML. This is the server-side allowlist that
// keeps stored/rendered comments free of script injection — the source of
// truth, independent of whatever the frontend sanitizes on render.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'b',
    'strong',
    'i',
    'em',
    'u',
    'a',
    'img',
    'br',
    'p',
    'div',
    'span',
    'ul',
    'ol',
    'li',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'style'],
    span: ['data-mention-user-id'],
  },
  allowedSchemesByTag: {
    a: ['http', 'https', 'mailto'],
    img: ['data', 'http', 'https'],
  },
  allowedStyles: {
    img: {
      'max-width': [/^100%$/],
      height: [/^auto$/],
    },
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      rel: 'noopener noreferrer',
      target: '_blank',
    }),
  },
};

export function sanitizeCommentHtml(input: string): string {
  return sanitizeHtml(input, SANITIZE_OPTIONS).trim();
}
