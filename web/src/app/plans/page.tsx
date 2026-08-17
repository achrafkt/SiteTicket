'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, MapPinOff, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useTicketStore } from '@/store/ticket-store';
import { ApiError } from '@/lib/api';
import { getProjectHubs } from '@/lib/project-hub-api';
import { mapProjectHub } from '@/lib/project-hub-mapper';
import { deleteProjectPlan, getProjectPlans } from '@/lib/plans-api';
import { mapPlan } from '@/lib/plan-mapper';
import { canManageProjectField } from '@/lib/project-hub-permissions';
import { PlanSelector } from '@/components/plans/PlanSelector';
import { PlanViewer, type PlanPin } from '@/components/plans/PlanViewer';
import { PlanUploadModal } from '@/components/plans/PlanUploadModal';
import { PlanPointAssignModal } from '@/components/plans/PlanPointAssignModal';
import { TicketDetailsPanel } from '@/components/tickets/TicketDetailsPanel';
import { CreateTicketPanel } from '@/components/tickets/CreateTicketPanel';
import { groupPlanVersions, isPdfPlan, type Plan } from '@/types/plan';
import type { ProjectHub } from '@/types/project-hub';

function initialParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(key);
}

export default function PlansPage() {
  const currentUser = useTicketStore((state) => state.currentUser);
  const tickets = useTicketStore((state) => state.tickets);
  const activeTicketId = useTicketStore((state) => state.activeTicketId);
  const isDetailsPanelOpen = useTicketStore((state) => state.isDetailsPanelOpen);
  const isCreatePanelOpen = useTicketStore((state) => state.isCreatePanelOpen);
  const loadInitialData = useTicketStore((state) => state.loadInitialData);
  const setActiveTicketId = useTicketStore((state) => state.setActiveTicketId);
  const toggleDetailsPanel = useTicketStore((state) => state.toggleDetailsPanel);
  const clearPlanFromTickets = useTicketStore((state) => state.clearPlanFromTickets);

  const [projects, setProjects] = useState<ProjectHub[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [selectedGroupKey, setSelectedGroupKey] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState('');

  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [isPinMode, setIsPinMode] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);
  const [deletePlanError, setDeletePlanError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
    toggleDetailsPanel(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoadingProjects(true);
      try {
        const apiProjects = await getProjectHubs();
        if (cancelled) return;
        const mapped = apiProjects.map(mapProjectHub);
        setProjects(mapped);
        const fromQuery = initialParam('projectId');
        setSelectedProjectId((current) => current || (fromQuery && mapped.some((p) => p.id === fromQuery) ? fromQuery : mapped[0]?.id ?? ''));
        setIsLoadingProjects(false);
      } catch (err) {
        if (cancelled) return;
        setProjectsError(err instanceof ApiError ? err.message : 'Impossible de charger les chantiers.');
        setIsLoadingProjects(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    let cancelled = false;

    async function load() {
      setIsLoadingPlans(true);
      setPlansError(null);
      try {
        const apiPlans = await getProjectPlans(selectedProjectId);
        if (cancelled) return;
        const mapped = apiPlans.map(mapPlan);
        setPlans(mapped);
        const groups = groupPlanVersions(mapped);
        const fromQuery = initialParam('planId');
        const groupFromQuery = fromQuery ? groups.find((g) => g.versions.some((v) => v.id === fromQuery)) : undefined;
        const nextGroup = groupFromQuery ?? groups[0] ?? null;
        setSelectedGroupKey(nextGroup?.key ?? '');
        setSelectedVersionId(fromQuery && nextGroup?.versions.some((v) => v.id === fromQuery) ? fromQuery : nextGroup?.versions[0]?.id ?? '');
        setPage(1);
        setIsLoadingPlans(false);
      } catch (err) {
        if (cancelled) return;
        setPlansError(err instanceof ApiError ? err.message : 'Impossible de charger les plans.');
        setIsLoadingPlans(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  const groups = useMemo(() => groupPlanVersions(plans), [plans]);
  const selectedPlan = plans.find((plan) => plan.id === selectedVersionId) ?? null;
  const canUpload = canManageProjectField(currentUser);

  function handleGroupChange(key: string) {
    setSelectedGroupKey(key);
    const group = groups.find((candidate) => candidate.key === key);
    setSelectedVersionId(group?.versions[0]?.id ?? '');
    setPage(1);
  }

  async function handleDeletePlan() {
    if (!selectedPlan) return;

    const pinnedCount = tickets.filter((ticket) => ticket.planId === selectedPlan.id).length;
    const warning =
      pinnedCount > 0
        ? ` ${pinnedCount} ticket${pinnedCount > 1 ? 's' : ''} actuellement épinglé${pinnedCount > 1 ? 's' : ''} sur ce plan ${pinnedCount > 1 ? 'seront dépinglés' : 'sera dépinglé'} (le ticket lui-même n’est pas supprimé).`
        : '';
    const confirmed = window.confirm(
      `Supprimer définitivement le plan "${selectedPlan.name}" ? Cette action est irréversible.${warning}`,
    );
    if (!confirmed) return;

    setIsDeletingPlan(true);
    setDeletePlanError(null);
    try {
      await deleteProjectPlan(selectedProjectId, selectedPlan.id);
      clearPlanFromTickets(selectedPlan.id);

      const remaining = plans.filter((plan) => plan.id !== selectedPlan.id);
      setPlans(remaining);
      const remainingGroups = groupPlanVersions(remaining);
      const sameGroup = remainingGroups.find((group) => group.key === selectedGroupKey);
      const nextGroup = sameGroup ?? remainingGroups[0] ?? null;
      setSelectedGroupKey(nextGroup?.key ?? '');
      setSelectedVersionId(nextGroup?.versions[0]?.id ?? '');
      setPage(1);
    } catch (err) {
      setDeletePlanError(err instanceof ApiError ? err.message : 'Impossible de supprimer ce plan.');
    } finally {
      setIsDeletingPlan(false);
    }
  }

  const pinnedTickets = useMemo(() => {
    if (!selectedPlan) return [];
    return tickets.filter(
      (ticket) => ticket.planId === selectedPlan.id && (!isPdfPlan(selectedPlan) || ticket.planPage === page),
    );
  }, [tickets, selectedPlan, page]);

  const pins: PlanPin[] = useMemo(() => {
    const ticketPins: PlanPin[] = pinnedTickets
      .filter((ticket): ticket is typeof ticket & { planX: number; planY: number } => ticket.planX !== null && ticket.planY !== null)
      .map((ticket) => ({
        id: ticket.id,
        x: ticket.planX,
        y: ticket.planY,
        label: `${ticket.reference} · ${ticket.title}`,
        tone: ticket.id === activeTicketId ? 'highlight' : 'default',
        onClick: () => {
          setActiveTicketId(ticket.id);
          toggleDetailsPanel(true);
        },
      }));

    if (pendingPoint) {
      ticketPins.push({ id: 'pending', x: pendingPoint.x, y: pendingPoint.y, label: 'Nouveau point', tone: 'pending' });
    }

    return ticketPins;
  }, [pinnedTickets, activeTicketId, pendingPoint, setActiveTicketId, toggleDetailsPanel]);

  const activeTicket = tickets.find((ticket) => ticket.id === activeTicketId) ?? null;

  return (
    <div className="flex h-full gap-4">
      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-[10px] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
          {isLoadingProjects ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <RefreshCw size={15} className="animate-spin" /> Chargement des chantiers...
            </div>
          ) : projectsError ? (
            <p className="text-sm text-red-600">{projectsError}</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun chantier accessible.</p>
          ) : (
            <PlanSelector
              projects={projects}
              selectedProjectId={selectedProjectId}
              onProjectChange={(id) => {
                setSelectedProjectId(id);
                setIsPinMode(false);
                setPendingPoint(null);
              }}
              groups={groups}
              selectedGroupKey={selectedGroupKey}
              onGroupChange={handleGroupChange}
              selectedVersionId={selectedVersionId}
              onVersionChange={(id) => {
                setSelectedVersionId(id);
                setPage(1);
              }}
            />
          )}

          <div className="flex items-center gap-2">
            {canUpload && selectedProjectId ? (
              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                <Upload size={14} /> Ajouter un plan
              </button>
            ) : null}
            {selectedPlan ? (
              <button
                type="button"
                onClick={() => {
                  setIsPinMode((value) => !value);
                  setPendingPoint(null);
                }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${
                  isPinMode ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {isPinMode ? <MapPinOff size={14} /> : <MapPin size={14} />}
                {isPinMode ? 'Annuler l’épinglage' : 'Épingler un ticket'}
              </button>
            ) : null}
            {canUpload && selectedPlan ? (
              <button
                type="button"
                onClick={handleDeletePlan}
                disabled={isDeletingPlan}
                title="Supprimer ce plan"
                className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {isDeletingPlan ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Supprimer
              </button>
            ) : null}
          </div>
        </div>

        {deletePlanError ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{deletePlanError}</p>
        ) : null}

        <div className="flex flex-1 flex-col overflow-hidden rounded-[10px] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
          {isLoadingPlans ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-400">
              <RefreshCw size={16} className="animate-spin" /> Chargement du plan...
            </div>
          ) : plansError ? (
            <div className="flex flex-1 items-center justify-center text-sm text-red-600">{plansError}</div>
          ) : !selectedPlan ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center text-sm text-gray-400">
              <p>Aucun plan pour ce chantier.</p>
              {canUpload ? <p>Ajoutez-en un pour commencer à épingler des tickets.</p> : null}
            </div>
          ) : (
            <>
              {isPinMode ? (
                <p className="mb-3 rounded-md bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                  Cliquez sur le plan à l’endroit où épingler un ticket.
                </p>
              ) : null}

              {isPdfPlan(selectedPlan) && pageCount > 1 ? (
                <div className="mb-3 flex items-center gap-1.5 text-sm text-gray-600">
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

              <PlanViewer
                key={selectedPlan.id}
                plan={selectedPlan}
                page={page}
                onPageCountChange={setPageCount}
                pins={pins}
                pickMode={isPinMode}
                onPick={(x, y) => setPendingPoint({ x, y })}
                className="flex-1"
              />
            </>
          )}
        </div>
      </div>

      {isCreatePanelOpen ? (
        <CreateTicketPanel />
      ) : isDetailsPanelOpen && activeTicket ? (
        <TicketDetailsPanel ticket={activeTicket} />
      ) : null}

      {isUploadOpen && selectedProjectId ? (
        <PlanUploadModal
          projectId={selectedProjectId}
          onClose={() => setIsUploadOpen(false)}
          onUploaded={(plan) => {
            setPlans((current) => [plan, ...current]);
            setSelectedGroupKey(`${plan.discipline ?? ''} ${plan.name}`);
            setSelectedVersionId(plan.id);
            setIsUploadOpen(false);
          }}
        />
      ) : null}

      {pendingPoint && selectedPlan ? (
        <PlanPointAssignModal
          projectId={selectedProjectId}
          planId={selectedPlan.id}
          planX={pendingPoint.x}
          planY={pendingPoint.y}
          planPage={isPdfPlan(selectedPlan) ? page : null}
          onClose={() => {
            setPendingPoint(null);
            setIsPinMode(false);
          }}
        />
      ) : null}
    </div>
  );
}
