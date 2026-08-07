'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export type DraftEditor = {
  userId: string;
  userName: string;
};

type UseTicketCollaborationResult = {
  connected: boolean;
  activeEditor: DraftEditor | null;
  announceEditing: () => void;
  takeControl: () => void;
  simulateRemoteEditor: (editor: DraftEditor) => void;
};

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Client hook for real-time draft collaboration on a ticket.
 *
 * This connects to a Socket.io namespace (`/tickets`) that is expected to emit/listen
 * to `draft:editing` and `draft:release` events scoped by ticketId. The corresponding
 * NestJS gateway does not exist yet on the backend — this hook is wired and ready to use
 * once that gateway is added. Until then, `simulateRemoteEditor` lets the UI be exercised
 * locally for demo/testing purposes without a live second client.
 */
export function useTicketCollaboration(
  ticketId: string,
  currentUser: { id: string; name: string },
): UseTicketCollaborationResult {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [activeEditor, setActiveEditor] = useState<DraftEditor | null>(null);

  useEffect(() => {
    const socket = io(`${SOCKET_URL}/tickets`, {
      transports: ['websocket'],
      reconnectionAttempts: 3,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('draft:editing', (payload: DraftEditor & { ticketId: string }) => {
      if (payload.ticketId !== ticketId || payload.userId === currentUser.id) return;
      setActiveEditor({ userId: payload.userId, userName: payload.userName });
    });

    socket.on('draft:release', (payload: { ticketId: string }) => {
      if (payload.ticketId !== ticketId) return;
      setActiveEditor(null);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [ticketId, currentUser.id]);

  function announceEditing() {
    socketRef.current?.emit('draft:editing', {
      ticketId,
      userId: currentUser.id,
      userName: currentUser.name,
    });
  }

  function takeControl() {
    socketRef.current?.emit('draft:release', { ticketId });
    setActiveEditor(null);
  }

  function simulateRemoteEditor(editor: DraftEditor) {
    setActiveEditor(editor);
  }

  return { connected, activeEditor, announceEditing, takeControl, simulateRemoteEditor };
}
