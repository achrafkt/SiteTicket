'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { Avatar } from '@/components/tickets/Avatar';
import { Dropdown } from '@/components/tickets/Dropdown';
import { ApiError, resolveAvatarUrl } from '@/lib/api';
import {
  addProjectMember,
  getAdminUsers,
  getProjectMembers,
  removeProjectMember,
  type ApiAdminUser,
  type ApiProjectMember,
} from '@/lib/admin-api';
import { FieldLabel } from './FieldLabel';

function userInitials(user: { first_name: string; last_name: string }): string {
  return `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase();
}

type ProjectMembersPanelProps = {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onMemberCountChange: (count: number) => void;
};

export function ProjectMembersPanel({
  projectId,
  projectName,
  onClose,
  onMemberCountChange,
}: ProjectMembersPanelProps) {
  const [members, setMembers] = useState<ApiProjectMember[]>([]);
  const [allUsers, setAllUsers] = useState<ApiAdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [roleOnProject, setRoleOnProject] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [membersData, usersData] = await Promise.all([
        getProjectMembers(projectId),
        getAdminUsers(),
      ]);
      setMembers(membersData);
      setAllUsers(usersData);
      onMemberCountChange(membersData.length);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger les membres.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const availableUsers = useMemo(
    () => allUsers.filter((user) => !members.some((member) => member.user.id === user.id)),
    [allUsers, members],
  );

  async function handleAdd() {
    if (!selectedUserId) return;
    setIsAdding(true);
    setActionError(null);
    try {
      const member = await addProjectMember(projectId, {
        userId: selectedUserId,
        roleOnProject: roleOnProject.trim() || undefined,
      });
      const nextMembers = [...members, member];
      setMembers(nextMembers);
      onMemberCountChange(nextMembers.length);
      setSelectedUserId('');
      setRoleOnProject('');
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Impossible d'ajouter ce membre.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemove(userId: string) {
    setPendingUserId(userId);
    setActionError(null);
    try {
      await removeProjectMember(projectId, userId);
      const nextMembers = members.filter((member) => member.user.id !== userId);
      setMembers(nextMembers);
      onMemberCountChange(nextMembers.length);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Impossible de retirer ce membre.');
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onClick={onClose}>
      <section
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Membres du chantier</h2>
            <p className="mt-0.5 text-xs text-gray-400">{projectName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
              <RefreshCw size={16} className="animate-spin" /> Chargement...
            </div>
          ) : loadError ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{loadError}</p>
          ) : (
            <>
              <div>
                <FieldLabel>Accès accordé ({members.length})</FieldLabel>
                {members.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-400">
                    Aucun membre. Ce chantier n’est visible que des rôles à accès global.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {members.map((member) => (
                      <li
                        key={member.id}
                        className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5"
                      >
                        <Avatar
                          initials={userInitials(member.user)}
                          avatarUrl={resolveAvatarUrl(member.user.avatar_url)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800">
                            {member.user.first_name} {member.user.last_name}
                          </p>
                          <p className="truncate text-xs text-gray-400">
                            {member.user.role.name}
                            {member.role_on_project ? ` · ${member.role_on_project}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemove(member.user.id)}
                          disabled={pendingUserId === member.user.id}
                          className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                <FieldLabel>Ajouter un membre</FieldLabel>
                <Dropdown
                  value={selectedUserId}
                  onChange={setSelectedUserId}
                  placeholder="Choisir un utilisateur"
                  options={availableUsers.map((user) => ({
                    value: user.id,
                    label: `${user.first_name} ${user.last_name}`,
                    description: user.role.name,
                    initials: userInitials(user),
                    avatarUrl: resolveAvatarUrl(user.avatar_url),
                  }))}
                />
                <input
                  value={roleOnProject}
                  onChange={(event) => setRoleOnProject(event.target.value)}
                  placeholder="Rôle sur le chantier (optionnel)"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!selectedUserId || isAdding}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:bg-gray-200 disabled:text-gray-400"
                >
                  {isAdding ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                  Ajouter au chantier
                </button>
              </div>

              {actionError ? (
                <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{actionError}</p>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
