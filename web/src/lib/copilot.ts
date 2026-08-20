export type CopilotMessageRole = 'user' | 'assistant';

export type CopilotMessage = {
  id: string;
  role: CopilotMessageRole;
  content: string;
  createdAt: string;
};

export const COPILOT_SUGGESTIONS: string[] = [
  'Quels chantiers sont en retard budgétaire ?',
  'Résume les tickets bloquants',
  'Quels tickets urgents ne sont pas encore assignés ?',
  "Quel est le taux de résolution ce mois-ci ?",
];

export function createCopilotMessage(role: CopilotMessageRole, content: string): CopilotMessage {
  return {
    id: `copilot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}
