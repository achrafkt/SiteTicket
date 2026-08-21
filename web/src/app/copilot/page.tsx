'use client';

import { useState } from 'react';
import { useTicketStore } from '@/store/ticket-store';
import { CopilotChat } from '@/components/copilot/CopilotChat';
import { CopilotSidebar } from '@/components/copilot/CopilotSidebar';

export default function CopilotPage() {
  const currentUser = useTicketStore((state) => state.currentUser);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  if (!currentUser) return null;

  return (
    <div className="flex h-full gap-3">
      <CopilotSidebar
        activeConversationId={activeConversationId}
        onSelect={setActiveConversationId}
        onNewConversation={() => setActiveConversationId(null)}
        refreshKey={sidebarRefreshKey}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <CopilotChat
          currentUser={currentUser}
          conversationId={activeConversationId}
          onConversationId={setActiveConversationId}
          onExchangeComplete={() => setSidebarRefreshKey((key) => key + 1)}
        />
      </div>
    </div>
  );
}
