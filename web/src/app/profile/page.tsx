'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/tickets/Avatar';
import { useTicketStore } from '@/store/ticket-store';
import { mapPerson } from '@/lib/ticket-mapper';
import { storeUser } from '@/lib/current-user';
import { API_URL, ApiError } from '@/lib/api';
import {
  changePassword,
  getMe,
  removeAvatar,
  updateProfile,
  uploadAvatar,
  type ApiProfileUser,
} from '@/lib/profile-api';

const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

function syncCurrentUser(user: ApiProfileUser) {
  storeUser(user);
  useTicketStore.getState().setCurrentUser(mapPerson(user));
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ApiProfileUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const user = await getMe();
        if (cancelled) return;
        setProfile(user);
        setFirstName(user.first_name);
        setLastName(user.last_name);
        setEmail(user.email);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger le profil.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  function handleAvatarFileSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    setAvatarError(null);

    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
      setAvatarError('Types acceptés : JPEG, PNG ou WebP.');
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError('Taille maximale : 2 Mo.');
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }

    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setPendingAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  }

  function cancelAvatarPreview() {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setPendingAvatarFile(null);
    setAvatarPreviewUrl(null);
    setAvatarError(null);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  }

  async function confirmAvatarUpload() {
    if (!pendingAvatarFile) return;
    setIsSavingAvatar(true);
    setAvatarError(null);
    try {
      const updated = await uploadAvatar(pendingAvatarFile);
      setProfile(updated);
      syncCurrentUser(updated);
      cancelAvatarPreview();
    } catch (err) {
      setAvatarError(err instanceof ApiError ? err.message : "Impossible d'envoyer la photo.");
    } finally {
      setIsSavingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    setIsSavingAvatar(true);
    setAvatarError(null);
    try {
      const updated = await removeAvatar();
      setProfile(updated);
      syncCurrentUser(updated);
    } catch (err) {
      setAvatarError(err instanceof ApiError ? err.message : 'Impossible de retirer la photo.');
    } finally {
      setIsSavingAvatar(false);
    }
  }

  async function handleSaveProfile() {
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const updated = await updateProfile({ firstName, lastName, email });
      setProfile(updated);
      syncCurrentUser(updated);
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Impossible de mettre à jour le profil.');
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Impossible de modifier le mot de passe.');
    } finally {
      setIsChangingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-400">
        <RefreshCw size={16} className="animate-spin" /> Chargement du profil...
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-sm text-red-600">{loadError ?? 'Profil introuvable.'}</p>
      </div>
    );
  }

  const displayAvatarUrl = avatarPreviewUrl ?? (profile.avatar_url ? `${API_URL}${profile.avatar_url}` : null);
  const initials = `${profile.first_name[0] ?? ''}${profile.last_name[0] ?? ''}`.toUpperCase();

  return (
    <section className="mx-auto max-w-2xl p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Mon profil</h1>
        <p className="mt-1 text-sm text-gray-500">Gérez votre photo, vos informations et votre mot de passe.</p>
      </header>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Photo de profil</h2>
        <div className="flex items-center gap-4">
          <Avatar initials={initials} avatarUrl={displayAvatarUrl} size="xl" />
          <div className="flex flex-col gap-2">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => handleAvatarFileSelected(event.target.files)}
              className="hidden"
            />
            {pendingAvatarFile ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={confirmAvatarUpload}
                  disabled={isSavingAvatar}
                  className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:bg-gray-200 disabled:text-gray-400"
                >
                  {isSavingAvatar ? <RefreshCw size={13} className="animate-spin" /> : null}
                  Confirmer
                </button>
                <button
                  type="button"
                  onClick={cancelAvatarPreview}
                  disabled={isSavingAvatar}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  <Camera size={13} /> {profile.avatar_url ? 'Changer la photo' : 'Ajouter une photo'}
                </button>
                {profile.avatar_url ? (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={isSavingAvatar}
                    className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={13} /> Retirer
                  </button>
                ) : null}
              </div>
            )}
            <p className="text-[11px] text-gray-400">JPEG, PNG ou WebP. 2 Mo maximum.</p>
            {avatarError ? <p className="text-xs text-red-600">{avatarError}</p> : null}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Informations</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Prénom</label>
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Nom</label>
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gray-500">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
        </div>

        {profileError ? (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{profileError}</p>
        ) : null}
        {profileSuccess ? (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Profil mis à jour.</p>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={isSavingProfile || !firstName.trim() || !lastName.trim() || !email.trim()}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-200 disabled:text-gray-400"
          >
            {isSavingProfile ? <RefreshCw size={14} className="animate-spin" /> : null}
            Enregistrer
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Mot de passe</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Mot de passe actuel</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Confirmer</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        {passwordError ? (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{passwordError}</p>
        ) : null}
        {passwordSuccess ? (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Mot de passe modifié.
          </p>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-200 disabled:text-gray-400"
          >
            {isChangingPassword ? <RefreshCw size={14} className="animate-spin" /> : null}
            Modifier le mot de passe
          </button>
        </div>
      </div>
    </section>
  );
}
