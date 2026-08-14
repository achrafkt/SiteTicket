'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle, BookOpen, ChevronDown, Mail, Phone, ExternalLink } from 'lucide-react';

type FaqEntry = {
  id: string;
  question: string;
  answer: string;
};

const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'create-ticket',
    question: 'Comment créer un ticket ?',
    answer: 'Cliquez sur "Créer" en haut de l\'écran, puis choisissez le type de ticket (RFI, réserve, ordre de service, sécurité...).',
  },
  {
    id: 'change-status',
    question: "Comment changer le statut d'un ticket ?",
    answer: 'Ouvrez le ticket, puis utilisez le menu déroulant "Statut" dans le panneau de détails.',
  },
  {
    id: 'find-procedures',
    question: 'Où trouver les procédures et fiches sécurité ?',
    answer: 'Rendez-vous dans la Base de connaissances, accessible depuis le menu latéral ou le lien ci-dessous.',
  },
];

export function HelpMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Aide"
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-white/80 transition-colors duration-200 hover:bg-white/14 hover:text-white"
      >
        <HelpCircle size={18} strokeWidth={1.75} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white text-gray-700 shadow-[0_18px_36px_rgba(15,23,42,0.16)]">
          <div className="border-b border-gray-100 px-3.5 py-2.5">
            <p className="text-sm font-semibold text-gray-900">Centre d&rsquo;aide</p>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            <div className="px-3.5 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Documentation</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push('/knowledge');
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-gray-50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <BookOpen size={15} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-gray-800">Base de connaissances</span>
                <span className="block truncate text-xs text-gray-400">Procédures, fiches sécurité, normes techniques, FAQ</span>
              </span>
              <ExternalLink size={14} className="shrink-0 text-gray-300" />
            </button>

            <div className="mt-1 border-t border-gray-100 px-3.5 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Questions fréquentes</p>
            </div>
            <div className="pb-1">
              {FAQ_ENTRIES.map((entry) => {
                const isExpanded = expandedFaqId === entry.id;
                return (
                  <div key={entry.id} className="px-3.5">
                    <button
                      type="button"
                      onClick={() => setExpandedFaqId((current) => (current === entry.id ? null : entry.id))}
                      className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                      {entry.question}
                      <ChevronDown
                        size={14}
                        className={`shrink-0 text-gray-400 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isExpanded ? <p className="pb-2.5 text-xs text-gray-500">{entry.answer}</p> : null}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-100 px-3.5 pb-3 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Contacter le support</p>
              <a
                href="mailto:support@siteticket.app"
                className="mt-2 flex items-center gap-2.5 rounded-lg px-0.5 py-1.5 text-sm text-gray-700 transition-colors hover:text-blue-700"
              >
                <Mail size={15} className="shrink-0 text-gray-400" />
                support@siteticket.app
              </a>
              <a
                href="tel:+33100000000"
                className="mt-1 flex items-center gap-2.5 rounded-lg px-0.5 py-1.5 text-sm text-gray-700 transition-colors hover:text-blue-700"
              >
                <Phone size={15} className="shrink-0 text-gray-400" />
                +33 1 00 00 00 00
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
