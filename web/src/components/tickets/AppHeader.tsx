"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, ChevronDown, HelpCircle, Bell, Plus } from "lucide-react";
import {
  FileQuestion,
  ClipboardList,
  RefreshCw,
  ShieldAlert,
  Wrench,
  FileCheck,
  Hammer,
} from "lucide-react";
import { useTicketStore } from "@/store/ticket-store";
import { clearStoredUser } from "@/lib/current-user";
import type { TicketTypeCode } from "@/types/ticket";
import { initialsAvatarColor } from "./ticket-visuals";

const CREATE_OPTION_ICONS: Record<TicketTypeCode, React.ElementType> = {
  RFI: FileQuestion,
  PUNCH: ClipboardList,
  CHANGE_ORDER: RefreshCw,
  SAFETY: ShieldAlert,
  MAINTENANCE: Wrench,
  SUBMITTAL: FileCheck,
  FIELD_ISSUE: Hammer,
};

export function AppHeader() {
  const router = useRouter();
  const currentUser = useTicketStore((state) => state.currentUser);
  const types = useTicketStore((state) => state.types);
  const openCreateTicketPanel = useTicketStore((state) => state.openCreateTicketPanel);
  const [isCreateMenuOpen, setCreateMenuOpen] = useState(false);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleLogout() {
    localStorage.removeItem("site-ticket-token");
    clearStoredUser();
    setUserMenuOpen(false);
    router.push("/login");
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        createRef.current &&
        !createRef.current.contains(event.target as Node)
      ) {
        setCreateMenuOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayUser = mounted ? currentUser : null;

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center gap-3  bg-nav-bg pr-4 text-white shadow-[0_10px_28px_rgba(8,26,77,0.32)]">
      <div className="flex w-16 shrink-0 items-center justify-center">
        <div className="flex w-16 shrink-0 items-center justify-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
            <Image
              src="/logo/logo-icon.png"
              alt="SiteTicket"
              width={36}
              height={36}
              className="h-full w-full object-contain"
              priority
            />
          </div>
        </div>
      </div>
      <span className="-ml-2 shrink-0 text-sm font-semibold tracking-[0.08em] text-white/95">
        SiteTicket
      </span>

      <div className="flex flex-1 justify-center px-4">
        <div className="flex w-full max-w-2xl items-center gap-3 rounded-md bg-white/12 px-4 py-2.5 text-base text-slate-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] backdrop-blur-sm transition-all duration-200 focus-within:bg-white/18 focus-within:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]">
          <Search size={18} className="text-white/80" />
          <input
            value={globalSearch}
            onChange={(event) => setGlobalSearch(event.target.value)}
            placeholder="Rechercher dans SiteTicket..."
            className="w-full bg-transparent text-base text-white placeholder:text-white/65 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="relative" ref={createRef}>
          <button
            type="button"
            onClick={() => setCreateMenuOpen((value) => !value)}
            className="flex items-center gap-1.5 rounded-xl bg-white/14 py-2 pl-3 pr-2.5 text-sm font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] transition-all duration-200 hover:bg-white/22"
          >
            <Plus size={15} />
            Créer
            <ChevronDown
              size={14}
              className={`transition-transform duration-150 ${isCreateMenuOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isCreateMenuOpen ? (
            <div className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 text-gray-700 shadow-[0_18px_36px_rgba(15,23,42,0.16)]">
              <p className="px-3.5 pb-2 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Type de ticket
              </p>
              <div className="border-t border-gray-100" />
              <div className="pt-1">
                {types.map((type) => {
                  const Icon = CREATE_OPTION_ICONS[type.code] ?? FileQuestion;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setCreateMenuOpen(false);
                        openCreateTicketPanel(type.id);
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Icon size={16} className="shrink-0 text-gray-400" />
                      {type.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          title="Aide"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white/80 transition-colors duration-200 hover:bg-white/14 hover:text-white"
        >
          <HelpCircle size={18} strokeWidth={1.75} />
        </button>

        <button
          type="button"
          title="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white/80 transition-colors duration-200 hover:bg-white/14 hover:text-white"
        >
          <Bell size={18} strokeWidth={1.75} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>

        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((value) => !value)}
            title={displayUser?.name ?? undefined}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white shadow-[0_6px_14px_rgba(2,6,23,0.35)] ${initialsAvatarColor(
              displayUser?.initials ?? '?',
            )}`}
          >
            {displayUser?.initials ?? '?'}
          </button>
          {isUserMenuOpen ? (
            <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl border border-slate-200 bg-white py-1.5 text-gray-700 shadow-[0_18px_36px_rgba(15,23,42,0.16)]">
              <p className="border-b border-gray-100 px-3.5 py-2.5 text-xs text-gray-400">
                {displayUser?.name} · {displayUser?.roleName}
              </p>
              <button
                type="button"
                className="block w-full px-3.5 py-2 text-left text-xs font-medium hover:bg-slate-50"
              >
                Profil
              </button>
              <button
                type="button"
                className="block w-full px-3.5 py-2 text-left text-xs font-medium hover:bg-slate-50"
              >
                Paramètres
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full px-3.5 py-2 text-left text-xs font-medium hover:bg-slate-50"
              >
                Déconnexion
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}