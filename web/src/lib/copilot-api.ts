import { API_URL } from './api';

const TOKEN_KEY = 'site-ticket-token';

export interface CopilotHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class CopilotApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'CopilotApiError';
    this.status = status;
  }
}

function handleUnauthorized() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('site-ticket-token');
  localStorage.removeItem('site-ticket-user');
  window.location.href = '/login';
}

interface StreamCopilotMessageOptions {
  onDelta: (text: string) => void;
  signal?: AbortSignal;
}

// Manual fetch (not apiFetch) — apiFetch awaits the full JSON body, but the
// copilot endpoint streams a text/event-stream response that must be read
// progressively via a ReadableStream reader.
export async function streamCopilotMessage(
  message: string,
  history: CopilotHistoryMessage[],
  { onDelta, signal }: StreamCopilotMessageOptions,
): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

  const response = await fetch(`${API_URL}/copilot/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, history }),
    signal,
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new CopilotApiError('Session expirée, merci de vous reconnecter.', 401);
  }

  if (response.status === 429) {
    const payload = await response.json().catch(() => null);
    throw new CopilotApiError(
      (payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message?: string }).message)
        : null) ?? 'Limite quotidienne de messages atteinte.',
      429,
    );
  }

  if (!response.ok || !response.body) {
    throw new CopilotApiError('Une erreur est survenue.', response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const rawEvent of events) {
      const lines = rawEvent.split('\n');
      const eventLine = lines.find((line) => line.startsWith('event: '));
      const dataLine = lines.find((line) => line.startsWith('data: '));
      if (!eventLine || !dataLine) continue;

      const eventType = eventLine.slice('event: '.length).trim();
      const data = JSON.parse(dataLine.slice('data: '.length)) as {
        text?: string;
        message?: string;
      };

      if (eventType === 'delta' && typeof data.text === 'string') {
        onDelta(data.text);
      } else if (eventType === 'error') {
        throw new CopilotApiError(
          data.message ?? 'Le copilote a rencontré une erreur.',
          500,
        );
      }
      // 'done' needs no handling — the stream simply ends right after it.
    }
  }
}
