import type { Person } from '@/types/ticket';

const USER_KEY = 'site-ticket-user';

export type LoginUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: {
    code: string;
    name: string;
  };
};

function initialsOf(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export function storeUser(user: LoginUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): Person | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    const user = JSON.parse(raw) as LoginUser;
    return {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      initials: initialsOf(user.first_name, user.last_name),
      email: user.email,
      roleCode: user.role?.code ?? null,
      roleName: user.role?.name ?? null,
    };
  } catch {
    return null;
  }
}
