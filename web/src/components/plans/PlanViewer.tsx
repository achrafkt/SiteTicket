'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { loadPdfjs } from '@/lib/pdfjs-setup';
import { isPdfPlan, type Plan } from '@/types/plan';

export type PlanPin = {
  id: string;
  x: number;
  y: number;
  label: string;
  tone?: 'default' | 'highlight' | 'pending';
  onClick?: () => void;
};

type PlanViewerProps = {
  plan: Plan;
  page: number;
  onPageCountChange?: (count: number) => void;
  pins?: PlanPin[];
  pickMode?: boolean;
  onPick?: (x: number, y: number) => void;
  className?: string;
};

const PIN_TONE_CLASSES: Record<NonNullable<PlanPin['tone']>, string> = {
  default: 'bg-red-600',
  highlight: 'bg-blue-600',
  pending: 'bg-amber-500',
};

export function PlanViewer({
  plan,
  page,
  onPageCountChange,
  pins = [],
  pickMode = false,
  onPick,
  className = '',
}: PlanViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPdf = isPdfPlan(plan);
  const [isRendering, setIsRendering] = useState(isPdf);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPdf) {
      onPageCountChange?.(1);
      return;
    }

    let cancelled = false;

    async function render() {
      setIsRendering(true);
      setRenderError(null);

      try {
        const pdfjsLib = await loadPdfjs();
        const doc = await pdfjsLib.getDocument({ url: plan.fileUrl }).promise;
        if (cancelled) return;
        onPageCountChange?.(doc.numPages);

        const pageNumber = Math.min(Math.max(page, 1), doc.numPages);
        const pdfPage = await doc.getPage(pageNumber);
        if (cancelled) return;

        const containerWidth = containerRef.current?.clientWidth ?? 900;
        const unscaledViewport = pdfPage.getViewport({ scale: 1 });
        const scale = containerWidth / unscaledViewport.width;
        const viewport = pdfPage.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await pdfPage.render({ canvasContext: context, viewport, canvas }).promise;
        if (!cancelled) setIsRendering(false);
      } catch {
        if (!cancelled) {
          setRenderError('Impossible d’afficher ce plan PDF.');
          setIsRendering(false);
        }
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [isPdf, plan.fileUrl, page, onPageCountChange]);

  function handleOverlayClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!pickMode || !onPick) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    onPick(Math.min(Math.max(x, 0), 1), Math.min(Math.max(y, 0), 1));
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-auto rounded-lg border border-gray-200 bg-gray-50 ${className}`}
    >
      <div className="relative inline-block">
        {isPdf ? (
          <canvas ref={canvasRef} className="block" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={plan.fileUrl} alt={plan.name} className="block w-full" draggable={false} />
        )}

        <div
          onClick={handleOverlayClick}
          className={`absolute inset-0 ${pickMode ? 'cursor-crosshair' : ''}`}
        >
          {pins.map((pin) => (
            <button
              key={pin.id}
              type="button"
              title={pin.label}
              onClick={(event) => {
                event.stopPropagation();
                pin.onClick?.();
              }}
              style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
              className="absolute -translate-x-1/2 -translate-y-full"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-md ${
                  PIN_TONE_CLASSES[pin.tone ?? 'default']
                }`}
              >
                <MapPin size={14} className="text-white" strokeWidth={2.5} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {isRendering ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
          <RefreshCw size={20} className="animate-spin text-gray-400" />
        </div>
      ) : null}

      {renderError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm text-red-600">
          {renderError}
        </div>
      ) : null}
    </div>
  );
}
