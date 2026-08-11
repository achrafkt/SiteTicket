'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react';
import { Dropdown } from '@/components/tickets/Dropdown';
import { CreateUserPanel } from '@/components/settings/CreateUserPanel';
import { ApiError } from '@/lib/api';
import { useTicketStore } from '@/store/ticket-store';
import {
  deleteAdminUser,
  getAdminUsers,
  getRoles,
  updateAdminUser,
  type ApiAdminUser,
  type ApiRole,
} from '@/lib/admin-api';

const SELF_GUARD_MESSAGE =
  'Vous ne pouvez pas modifier votre propre rôle, vous désactiver ni supprimer votre propre compte.';
const LAST_ADMIN_GUARD_MESSAGE =
  'Dernier administrateur actif : impossible de modifier son rôle, le désactiver ou le supprimer.';

function getGuardReason(
  user: ApiAdminUser,
  currentUserId: string | null,
  activeAdminCount: number,
): string | null {
  if (user.role.code !== 'admin') return null;
  if (currentUserId === user.id) return SELF_GUARD_MESSAGE;
  if (user.is_active && activeAdminCount <= 1) return LAST_ADMIN_GUARD_MESSAGE;
  return null;
}

export default function UsersSettingsPage() {
  const currentUser = useTicketStore((state) => state.currentUser);
  const [users, setUsers] = useState<ApiAdminUser[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [isPanelOpen, setPanelOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [usersData, rolesData] = await Promise.all([getAdminUsers(), getRoles()]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger les utilisateurs.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const activeAdminCount = users.filter((user) => user.role.code === 'admin' && user.is_active).length;

  async function handleRoleChange(user: ApiAdminUser, roleId: string) {
    const guardReason = getGuardReason(user, currentUser?.id ?? null, activeAdminCount);
    if (guardReason) {
      setRowError(guardReason);
      return;
    }

    const previous = users;
    const nextRole = roles.find((role) => role.id === roleId);
    setRowError(null);
    setUsers((current) =>
      current.map((candidate) =>
        candidate.id === user.id && nextRole ? { ...candidate, role: nextRole } : candidate,
      ),
    );

    try {
      await updateAdminUser(user.id, { roleId });
    } catch (err) {
      setUsers(previous);
      setRowError(err instanceof ApiError ? err.message : 'Impossible de modifier le rôle.');
    }
  }

  async function handleToggleActive(user: ApiAdminUser) {
    if (user.is_active) {
      const guardReason = getGuardReason(user, currentUser?.id ?? null, activeAdminCount);
      if (guardReason) {
        setRowError(guardReason);
        return;
      }
    }

    const previous = users;
    setRowError(null);
    setUsers((current) =>
      current.map((candidate) =>
        candidate.id === user.id ? { ...candidate, is_active: !candidate.is_active } : candidate,
      ),
    );

    try {
      await updateAdminUser(user.id, { isActive: !user.is_active });
    } catch (err) {
      setUsers(previous);
      setRowError(err instanceof ApiError ? err.message : 'Impossible de modifier le statut.');
    }
  }

  async function handleDeleteUser(user: ApiAdminUser) {
    const guardReason = getGuardReason(user, currentUser?.id ?? null, activeAdminCount);
    if (guardReason) {
      setRowError(guardReason);
      return;
    }

    const confirmed = window.confirm(
      `Supprimer définitivement le compte de ${user.first_name} ${user.last_name} (${user.email}) ? Cette action est irréversible.`,
    );
    if (!confirmed) return;

    setRowError(null);
    setDeletingId(user.id);
    try {
      await deleteAdminUser(user.id);
      setUsers((current) => current.filter((candidate) => candidate.id !== user.id));
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Impossible de supprimer l'utilisateur.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mx-auto max-w-5xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Utilisateurs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez les comptes et les rôles de la plateforme. La création de compte est réservée aux
            administrateurs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={15} /> Nouvel utilisateur
        </button>
      </header>

      {rowError ? (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{rowError}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
            <RefreshCw size={16} className="animate-spin" /> Chargement...
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-gray-500">
            <p className="text-red-600">{loadError}</p>
            <button
              type="button"
              onClick={load}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => {
                const guardReason = getGuardReason(user, currentUser?.id ?? null, activeAdminCount);
                const roleLocked = guardReason !== null;
                const statusLocked = user.is_active && guardReason !== null;
                const deleteLocked = guardReason !== null;
                const isDeleting = deletingId === user.id;

                return (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {user.first_name} {user.last_name}
                      {currentUser?.id === user.id ? (
                        <span className="ml-1.5 text-xs font-normal text-gray-400">(vous)</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <Dropdown
                        value={user.role.id}
                        onChange={(roleId) => handleRoleChange(user, roleId)}
                        options={roles.map((role) => ({ value: role.id, label: role.name }))}
                        className="max-w-55"
                        disabled={roleLocked}
                        title={guardReason ?? undefined}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(user)}
                        disabled={statusLocked}
                        title={statusLocked ? (guardReason ?? undefined) : undefined}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          statusLocked
                            ? 'cursor-not-allowed opacity-60'
                            : ''
                        } ${
                          user.is_active
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {user.is_active ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
                        {user.is_active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user)}
                        disabled={deleteLocked || isDeleting}
                        title={deleteLocked ? (guardReason ?? undefined) : 'Supprimer'}
                        className="inline-flex items-center gap-1.5 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                      >
                        {isDeleting ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                    Aucun utilisateur.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      {isPanelOpen ? (
        <CreateUserPanel
          roles={roles}
          onClose={() => setPanelOpen(false)}
          onCreated={(user) => {
            setUsers((current) => [user, ...current]);
            setPanelOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}
