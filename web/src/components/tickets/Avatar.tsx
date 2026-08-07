import { initialsAvatarColor } from './ticket-visuals';

type AvatarProps = {
  initials: string;
  size?: 'sm' | 'md';
  title?: string;
};

export function Avatar({ initials, size = 'sm', title }: AvatarProps) {
  const dimension = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 text-xs';
  return (
    <span
      title={title}
      className={`inline-flex ${dimension} items-center justify-center rounded-full font-medium text-white ${initialsAvatarColor(
        initials,
      )}`}
    >
      {initials}
    </span>
  );
}

export function AvatarStack({ people }: { people: { name: string; initials: string }[] }) {
  if (people.length === 0) {
    return <span className="text-xs text-gray-400">Non assigné</span>;
  }

  return (
    <span className="flex -space-x-2">
      {people.map((person) => (
        <span key={person.name} className="ring-2 ring-white rounded-full">
          <Avatar initials={person.initials} title={person.name} />
        </span>
      ))}
    </span>
  );
}
