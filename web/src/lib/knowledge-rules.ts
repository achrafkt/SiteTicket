import type { KnowledgeFreshness } from '@/types/knowledge';

const EXPIRING_SOON_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Computes an article's freshness relative to `now`.
 * `validUntil` is what perishable content (standards, VGP...) is tracked
 * against; `needsReview` is an independent manual flag for evergreen
 * content an author wants a second look at.
 */
export function getArticleFreshness(
  validUntil: string | null,
  needsReview: boolean,
  now: Date = new Date(),
): KnowledgeFreshness {
  if (validUntil) {
    const due = new Date(validUntil);
    due.setHours(23, 59, 59, 999);
    const diffMs = due.getTime() - now.getTime();

    if (diffMs < 0) return 'expired';
    if (diffMs <= EXPIRING_SOON_THRESHOLD_MS) return 'expiring_soon';
  }

  return needsReview ? 'to_review' : 'valid';
}
