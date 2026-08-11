'use client';

import { useState } from 'react';
import { Check, Copy, RefreshCw, Wand2, X } from 'lucide-react';
import { Dropdown } from '@/components/tickets/Dropdown';
import { ApiError } from '@/lib/api';
import { createAdminUser, type ApiAdminUser, type ApiRole } from '@/lib/admin-api';
import { FieldLabel } from './FieldLabel';

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let result = '';
  for (let i = 0; i < 12; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

type CreateUserPanelProps = {
  roles: ApiRole[];
  onClose: () => void;
  onCreated: (user: ApiAdminUser) => void;
};

export function CreateUserPanel({ roles, onClose, onCreated }: CreateUserPanelProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '');
  const [password, setPassword] = useState(generateTemporaryPassword);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    roleId.length > 0 &&
    password.length >= 8 &&
    !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const user = await createAdminUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        roleId,
        password,
      });
      onCreated(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de créer l'utilisateur.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Impossible de copier le mot de passe dans le presse-papiers.");
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
            <h2 className="text-lg font-semibold text-gray-900">Nouvel utilisateur</h2>
            <p className="mt-0.5 text-xs text-gray-400">Création de compte réservée aux administrateurs</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Prénom *</FieldLabel>
              <input
                autoFocus
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
              />
            </div>
            <div>
              <FieldLabel>Nom *</FieldLabel>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Email *</FieldLabel>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nom@entreprise.com"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>

          <div>
            <FieldLabel>Téléphone</FieldLabel>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>

          <div>
            <FieldLabel>Rôle *</FieldLabel>
            <Dropdown
              value={roleId}
              onChange={setRoleId}
              options={roles.map((role) => ({ value: role.id, label: role.name }))}
            />
          </div>

          <div>
            <FieldLabel>Mot de passe temporaire *</FieldLabel>
            <div className="flex items-center gap-2">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
              />
              <button
                type="button"
                title="Régénérer"
                onClick={() => setPassword(generateTemporaryPassword())}
                className="shrink-0 rounded-md border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
              >
                <Wand2 size={14} />
              </button>
              <button
                type="button"
                title="Copier"
                onClick={handleCopyPassword}
                className="shrink-0 rounded-md border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              Communiquez ce mot de passe à l&apos;utilisateur ; il pourra le modifier après connexion.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-3">
          {error ? (
            <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-200 disabled:text-gray-400"
            >
              {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : null}
              Créer le compte
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
