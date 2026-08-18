'use client';

import { useTicketStore } from '@/store/ticket-store';
import { CopilotChat } from '@/components/copilot/CopilotChat';

export default function CopilotPage() {
  const currentUser = useTicketStore((state) => state.currentUser);

  if (!currentUser) return null;

  return (
    <div className="flex h-full flex-col">
      <CopilotChat currentUser={currentUser} />
    </div>
  );
}
