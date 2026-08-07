'use client';

import { useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { useTicketStore } from '@/store/ticket-store';
import type { Ticket } from '@/types/ticket';

export function CreateKnowledgePanel({ ticket }: { ticket: Ticket }) {
  const toggleKnowledgePanel = useTicketStore((state) => state.toggleKnowledgePanel);
  const [questions, setQuestions] = useState([ticket.title]);
  const [answer, setAnswer] = useState('');
  const [folder, setFolder] = useState('');
  const [expiration, setExpiration] = useState('');
  const [autocomplete, setAutocomplete] = useState(true);

  function addQuestionVariant() {
    setQuestions((current) => [...current, '']);
  }

  function updateQuestion(index: number, value: string) {
    setQuestions((current) => current.map((question, i) => (i === index ? value : question)));
  }

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-gray-100 bg-white">
      <div className="border-b border-gray-100 p-3">
        <button
          type="button"
          onClick={() => toggleKnowledgePanel(false)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={15} /> Retour
        </button>
      </div>

      <div className="helpdesk-scroll flex-1 space-y-4 overflow-y-auto p-4">
        <h2 className="text-base font-semibold text-gray-900">Créer une nouvelle fiche</h2>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Nouvelle question *
          </label>
          <div className="space-y-2">
            {questions.map((question, index) => (
              <input
                key={index}
                value={question}
                onChange={(event) => updateQuestion(index, event.target.value)}
                className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none"
              />
            ))}
          </div>
          <button
            type="button"
            onClick={addQuestionVariant}
            className="mt-1.5 flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
          >
            <Plus size={12} /> Ajouter une variante
          </button>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Nouvelle réponse *
          </label>
          <textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            rows={5}
            className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Astuce : les réponses courtes et précises fonctionnent mieux.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Enregistrer dans *
          </label>
          <select
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
            className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none"
          >
            <option value="">Sélectionner une catégorie</option>
            <option value="rfi">RFI &amp; clarifications techniques</option>
            <option value="reserves">Réserves &amp; punch list</option>
            <option value="qse">Sécurité / QSE</option>
            <option value="administratif">Administratif &amp; contractuel</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Expiration
          </label>
          <input
            type="date"
            value={expiration}
            onChange={(event) => setExpiration(event.target.value)}
            className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2">
          <span className="text-sm text-gray-700">Autocomplétion</span>
          <button
            type="button"
            onClick={() => setAutocomplete((value) => !value)}
            className={`h-5 w-9 rounded-full transition-colors ${autocomplete ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <span
              className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                autocomplete ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-gray-100 p-3">
        <button
          type="button"
          className="flex-1 rounded-md border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Enregistrer en brouillon local
        </button>
        <button
          type="button"
          className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Enregistrer dans la BDC
        </button>
      </div>
    </aside>
  );
}
