import { initialsAvatarColor } from './ticket-visuals';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-7 w-7 text-xs',
  lg: 'h-9 w-9 text-sm',
  xl: 'h-20 w-20 text-2xl',
};

type AvatarProps = {
  initials: string;
  avatarUrl?: string | null;
  size?: AvatarSize;
  title?: string;
};

// Single point of change: every call site (header, ticket cards, assignee
// picker, reporter field, conversation thread...) passes avatarUrl and
// automatically shows the real photo, falling back to initials otherwise.
export function Avatar({ initials, avatarUrl, size = 'sm', title }: AvatarProps) {
  const dimension = SIZE_CLASSES[size];

  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- avatars are served from our own API host, not worth Next/Image domain config
    return <img src={avatarUrl} alt={title ?? initials} title={title} className={`inline-block ${dimension} shrink-0 rounded-full object-cover`} />;
  }

  return (
    <span
      title={title}
      className={`inline-flex ${dimension} shrink-0 items-center justify-center rounded-full font-medium text-white ${initialsAvatarColor(
        initials,
      )}`}
    >
      {initials}
    </span>
  );
}

export function AvatarStack({
  people,
}: {
  people: { name: string; initials: string; avatarUrl?: string | null }[];
}) {
  if (people.length === 0) {
    return <span className="text-xs text-gray-400">Non assigné</span>;
  }

  return (
    <span className="flex -space-x-2">
      {people.map((person) => (
        <span key={person.name} className="ring-2 ring-white rounded-full">
          <Avatar initials={person.initials} avatarUrl={person.avatarUrl} title={person.name} />
        </span>
      ))}
    </span>
  );
}
