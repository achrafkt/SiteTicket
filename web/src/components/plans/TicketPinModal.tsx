'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPinOff, RefreshCw, X } from 'lucide-react';
import { Dropdown } from '@/components/tickets/Dropdown';
import { ApiError } from '@/lib/api';
import { getProjectPlans } from '@/lib/plans-api';
import { mapPlan } from '@/lib/plan-mapper';
import { PlanViewer, type PlanPin } from './PlanViewer';
import { isPdfPlan, type Plan } from '@/types/plan';

export type PlanPinValue = {
  planId: string;
  planX: number;
  planY: number;
  planPage: number | null;
};

type TicketPinModalProps = {
  projectId: string;
  currentPin?: PlanPinValue | null;
  onClose: () => void;
  onSave: (pin: PlanPinValue) => void;
  onRemove?: () => void;
};

export function TicketPinModal({ projectId, currentPin, onClose, onSave, onRemove }: TicketPinModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState(currentPin?.planId ?? '');
  const [page, setPage] = useState(currentPin?.planPage ?? 1);
  const [pageCount, setPageCount] = useState(1);
  const [pickedPoint, setPickedPoint] = useState<{ x: number; y: number } | null>(
    currentPin ? { x: currentPin.planX, y: currentPin.planY } : null,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const apiPlans = await getProjectPlans(projectId);
        if (cancelled) return;
        const mapped = apiPlans.map(mapPlan);
        setPlans(mapped);
        setSelectedPlanId((current) => current || currentPin?.planId || mapped[0]?.id || '');
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger les plans.');
        setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;

  function handlePlanChange(planId: string) {
    setSelectedPlanId(planId);
    setPage(1);
    setPageCount(1);
    setPickedPoint(currentPin && currentPin.planId === planId ? { x: currentPin.planX, y: currentPin.planY } : null);
  }

  const pins: PlanPin[] = useMemo(() => {
    if (pickedPoint) {
      return [{ id: 'pending', x: pickedPoint.x, y: pickedPoint.y, label: 'Nouvelle position', tone: 'pending' }];
    }
    return [];
  }, [pickedPoint]);

  function handleSave() {
    if (!selectedPlan || !pickedPoint) return;
    onSave({
      planId: selectedPlan.id,
      planX: pickedPoint.x,
      planY: pickedPoint.y,
      planPage: isPdfPlan(selectedPlan) ? page : null,
    });
    onClose();
  }

  function handleRemove() {
    onRemove?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={onClose}>
      <section
        className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Positionner sur le plan</h2>
            <p className="mt-0.5 text-xs text-gray-400">Cliquez sur le plan pour définir l’emplacement</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
              <RefreshCw size={16} className="animate-spin" /> Chargement des plans...
            </div>
          ) : loadError ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{loadError}</p>
          ) : plans.length === 0 ? (
            <p className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-400">
              Aucun plan disponible pour ce chantier.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="w-72">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Plan</p>
                  <Dropdown
                    value={selectedPlanId}
                    onChange={handlePlanChange}
                    options={plans.map((plan) => ({
                      value: plan.id,
                      label: plan.name,
                      description: [plan.discipline, plan.version].filter(Boolean).join(' · ') || undefined,
                    }))}
                  />
                </div>

                {selectedPlan && isPdfPlan(selectedPlan) && pageCount > 1 ? (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page <= 1}
                      className="rounded-md border border-gray-200 p-1 disabled:opacity-40"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    Page {page} / {pageCount}
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                      disabled={page >= pageCount}
                      className="rounded-md border border-gray-200 p-1 disabled:opacity-40"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ) : null}
              </div>

              {selectedPlan ? (
                <PlanViewer
                  plan={selectedPlan}
                  page={page}
                  onPageCountChange={setPageCount}
                  pins={pins}
                  pickMode
                  onPick={(x, y) => setPickedPoint({ x, y })}
                  className="max-h-[60vh]"
                />
              ) : null}
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
          {onRemove && currentPin ? (
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:underline"
            >
              <MapPinOff size={14} /> Retirer du plan
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedPlan || !pickedPoint}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-200 disabled:text-gray-400"
            >
              Enregistrer la position
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
