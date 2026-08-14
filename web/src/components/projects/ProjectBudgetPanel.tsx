'use client';

import { useState } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatProjectDate } from '@/lib/project-hub-format';
import { createProjectExpense, deleteProjectExpense } from '@/lib/project-hub-api';
import { mapProjectHubExpense } from '@/lib/project-hub-mapper';
import type { ProjectHubExpense } from '@/types/project-hub';

type ProjectBudgetPanelProps = {
  projectId: string;
  budgetPlanned: number | null;
  expenses: ProjectHubExpense[];
  canEdit: boolean;
  onChange: (expenses: ProjectHubExpense[]) => void;
};

export function ProjectBudgetPanel({
  projectId,
  budgetPlanned,
  expenses,
  canEdit,
  onChange,
}: ProjectBudgetPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingExpenseId, setPendingExpenseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const spent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const variance = budgetPlanned === null ? null : budgetPlanned - spent;

  async function handleCreate() {
    if (!label.trim() || !amount.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createProjectExpense(projectId, {
        label: label.trim(),
        amount: Number(amount),
        category: category.trim() || undefined,
      });
      onChange([mapProjectHubExpense(created), ...expenses]);
      setLabel('');
      setAmount('');
      setCategory('');
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible d’ajouter la dépense.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(expenseId: string) {
    setPendingExpenseId(expenseId);
    setError(null);
    try {
      await deleteProjectExpense(projectId, expenseId);
      onChange(expenses.filter((expense) => expense.id !== expenseId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de supprimer la dépense.');
    } finally {
      setPendingExpenseId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-gray-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Prévisionnel</p>
          <p className="mt-1 text-sm font-semibold text-gray-800">{formatCurrency(budgetPlanned)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Dépensé</p>
          <p className="mt-1 text-sm font-semibold text-gray-800">{formatCurrency(spent)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Écart</p>
          <p
            className={`mt-1 text-sm font-semibold ${
              variance !== null && variance < 0 ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {variance === null ? '—' : formatCurrency(variance)}
          </p>
        </div>
      </div>

      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p> : null}

      {expenses.length === 0 && !isCreating ? (
        <p className="py-4 text-center text-sm text-gray-400">Aucune dépense enregistrée.</p>
      ) : (
        <ul className="space-y-2">
          {expenses.map((expense) => (
            <li
              key={expense.id}
              className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">{expense.label}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {expense.category ? `${expense.category} · ` : ''}
                  {formatProjectDate(expense.expenseDate)}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium text-gray-700">
                {formatCurrency(expense.amount)}
              </span>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => handleDelete(expense.id)}
                  disabled={pendingExpenseId === expense.id}
                  className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        isCreating ? (
          <div className="space-y-2 rounded-lg border border-gray-200 p-3">
            <input
              autoFocus
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Libellé de la dépense"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Montant (MAD)"
                className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
              />
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Catégorie (optionnel)"
                className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!label.trim() || !amount.trim() || isSubmitting}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:bg-gray-200 disabled:text-gray-400"
              >
                {isSubmitting ? <RefreshCw size={12} className="animate-spin" /> : null}
                Ajouter
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            <Plus size={14} /> Ajouter une dépense
          </button>
        )
      ) : null}
    </div>
  );
}
