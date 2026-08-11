'use client';

import { FileText, Image as ImageIcon, X } from 'lucide-react';
import { formatFileSize } from './ticket-visuals';

type AttachmentThumbProps = {
  fileName: string;
  fileType: string | null;
  fileSize: number;
  fileUrl?: string;
  onRemove?: () => void;
  disabled?: boolean;
  disabledReason?: string;
};

export function AttachmentThumb({
  fileName,
  fileType,
  fileSize,
  fileUrl,
  onRemove,
  disabled,
  disabledReason,
}: AttachmentThumbProps) {
  const isImage = fileType?.startsWith('image/') ?? false;

  const content = (
    <>
      {isImage && fileUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fileUrl} alt={fileName} className="h-9 w-9 shrink-0 rounded object-cover" />
      ) : isImage ? (
        <ImageIcon size={16} className="shrink-0 text-blue-500" />
      ) : (
        <FileText size={16} className="shrink-0 text-red-500" />
      )}
      <span className="min-w-0">
        <span className="block max-w-[160px] truncate text-xs font-medium text-gray-700">{fileName}</span>
        <span className="block text-[11px] text-gray-400">{formatFileSize(fileSize)}</span>
      </span>
    </>
  );

  const className =
    'flex items-center gap-2 rounded-md border border-gray-200 px-2.5 py-1.5 text-left hover:bg-gray-50';

  return (
    <span className="relative inline-flex">
      {fileUrl ? (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={className}>
          {content}
        </a>
      ) : (
        <span className={className}>{content}</span>
      )}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          title={disabled ? (disabledReason ?? 'Retirer') : 'Retirer'}
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-500 text-white hover:bg-gray-700 disabled:opacity-50"
        >
          <X size={10} />
        </button>
      ) : null}
    </span>
  );
}
