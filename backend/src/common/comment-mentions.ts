const MENTION_ATTR_REGEX = /data-mention-user-id="([0-9a-fA-F-]{36})"/g;

// Comment bodies store mentions as <span data-mention-user-id="...">@Name</span>
// inside the already-sanitized HTML — this pulls the referenced user ids back out
// so the notification trigger knows who to notify.
export function extractMentionedUserIds(html: string): string[] {
  const ids = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = MENTION_ATTR_REGEX.exec(html))) {
    ids.add(match[1]);
  }
  return Array.from(ids);
}
