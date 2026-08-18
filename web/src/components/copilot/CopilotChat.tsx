'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { Avatar } from '@/components/tickets/Avatar';
import {
  COPILOT_SUGGESTIONS,
  createCopilotMessage,
  getCopilotMockResponse,
  type CopilotMessage,
} from '@/lib/copilot-mock';
import type { Person } from '@/types/ticket';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-nav-bg-active/10">
      <Sparkles size={14} strokeWidth={2} className="text-nav-accent" />
    </div>
  );
}

export function CopilotChat({ currentUser }: { currentUser: Person }) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isThinking]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    setMessages((prev) => [...prev, createCopilotMessage('user', trimmed)]);
    setInput('');
    setIsThinking(true);

    const reply = await getCopilotMockResponse(trimmed);
    setMessages((prev) => [...prev, createCopilotMessage('assistant', reply)]);
    setIsThinking(false);
    textareaRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-nav-bg-active/10">
          <Sparkles size={18} strokeWidth={1.75} className="text-nav-accent" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-gray-900">Copilote IA</h1>
            <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-tight text-slate-900">
              Bêta
            </span>
          </div>
          <p className="text-xs text-gray-500">Posez une question sur vos chantiers, tickets ou budgets.</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-nav-bg-active/10">
              <Sparkles size={24} strokeWidth={1.75} className="text-nav-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Comment puis-je vous aider aujourd&apos;hui ?</p>
              <p className="mt-1 max-w-sm text-xs text-gray-500">
                Cette version du copilote fonctionne avec des réponses simulées, à titre de démonstration.
              </p>
            </div>
            <div className="flex w-full max-w-md flex-col gap-2">
              {COPILOT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void sendMessage(suggestion)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:border-nav-accent/40 hover:bg-nav-bg-active/5"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) =>
              message.role === 'user' ? (
                <div key={message.id} className="flex items-start justify-end gap-2">
                  <div className="flex max-w-[75%] flex-col items-end gap-1">
                    <div className="rounded-2xl rounded-br-sm bg-blue-600 px-3.5 py-2 text-sm text-white">
                      {message.content}
                    </div>
                    <span className="text-[10px] text-gray-400">{formatTime(message.createdAt)}</span>
                  </div>
                  <Avatar initials={currentUser.initials} avatarUrl={currentUser.avatarUrl} size="md" />
                </div>
              ) : (
                <div key={message.id} className="flex items-start gap-2">
                  <AssistantAvatar />
                  <div className="flex max-w-[75%] flex-col items-start gap-1">
                    <div className="rounded-2xl rounded-bl-sm bg-gray-100 px-3.5 py-2 text-sm whitespace-pre-wrap text-gray-800">
                      {message.content}
                    </div>
                    <span className="text-[10px] text-gray-400">{formatTime(message.createdAt)}</span>
                  </div>
                </div>
              ),
            )}
            {isThinking ? (
              <div className="flex items-start gap-2">
                <AssistantAvatar />
                <div className="rounded-2xl rounded-bl-sm bg-gray-100 px-3.5 py-2">
                  <TypingIndicator />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 p-3">
        <div className="flex items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-nav-accent/50">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez votre question..."
            rows={1}
            disabled={isThinking}
            className="max-h-32 flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={() => void sendMessage(input)}
            disabled={isThinking || !input.trim()}
            title="Envoyer"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            <Send size={15} />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[10px] text-gray-400">
          Version bêta — réponses simulées, non connectées à vos données réelles.
        </p>
      </div>
    </div>
  );
}
