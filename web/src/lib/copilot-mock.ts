// Mock du Copilote IA — aucune donnée réelle, aucun appel API.
// Simule la latence et le style de réponse d'un vrai assistant pour
// démontrer le produit final avant le branchement sur l'API Anthropic.

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

type ResponseRule = {
  keywords: string[];
  responses: string[];
};

const RULES: ResponseRule[] = [
  {
    keywords: ['budget', 'coût', 'cout', 'dépass', 'depass', 'financ'],
    responses: [
      "D'après les données du module Analytics, 3 chantiers dépassent leur budget prévisionnel de plus de 10 % : **Résidence Les Tilleuls** (+14 %), **Tour Horizon** (+22 %) et **Extension Zone Nord** (+11 %). Voulez-vous le détail poste par poste ?",
      "Sur les 12 chantiers actifs, 3 affichent un dépassement budgétaire notable. Le plus critique est **Tour Horizon**, à +22 % du prévisionnel, principalement dû aux avenants sur le lot gros-œuvre.",
    ],
  },
  {
    keywords: ['bloquant', 'bloqué', 'bloque', 'blocage'],
    responses: [
      "Il y a actuellement 7 tickets marqués comme bloquants, dont 4 en attente d'une validation externe. Le plus ancien date de 6 jours (TCK-2418 — Fissure structurelle façade nord). Je peux vous lister les 7 en détail si besoin.",
      "7 tickets bloquants sont ouverts en ce moment, répartis sur 4 chantiers. La majorité concerne des validations en attente d'un intervenant externe (bureau de contrôle, sous-traitant).",
    ],
  },
  {
    keywords: ['retard', 'délai', 'delai', 'planning', 'échéance', 'echeance'],
    responses: [
      "2 chantiers accusent un retard de planning supérieur à 2 semaines : **Résidence Les Tilleuls** (18 jours) et **Extension Zone Nord** (9 jours). Le retard est principalement lié à des tickets bloquants non résolus.",
    ],
  },
  {
    keywords: ['urgent', 'priorité', 'priorite', 'assign'],
    responses: [
      "5 tickets urgents ne sont pas encore assignés. 3 d'entre eux ont été créés il y a plus de 48h. Souhaitez-vous que je vous propose une répartition selon la charge actuelle de l'équipe ?",
    ],
  },
  {
    keywords: ['résolution', 'resolution', 'taux', 'performance'],
    responses: [
      "Le taux de résolution ce mois-ci est de 78 %, en hausse de 5 points par rapport au mois dernier. Le temps moyen de résolution est de 34 heures.",
    ],
  },
  {
    keywords: ['bonjour', 'salut', 'hello', 'bonsoir'],
    responses: [
      "Bonjour ! Je suis le Copilote IA de SiteTicket, encore en version bêta. Posez-moi une question sur vos chantiers, vos tickets ou vos budgets.",
    ],
  },
];

const FALLBACKS = [
  "Bonne question. Dans une future version, je pourrai analyser vos données réelles pour y répondre précisément — pour l'instant cette réponse est simulée à titre de démonstration.",
  "Je n'ai pas encore accès aux données réelles de vos chantiers dans cette version bêta, mais c'est exactement le type de question à laquelle je pourrai répondre une fois branché sur vos données.",
  "Cette fonctionnalité est en cours de conception. Une fois connectée à vos chantiers, tickets et budgets réels, je pourrai vous donner une réponse précise ici.",
];

function pickRandom(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

function buildReply(userText: string): string {
  const normalized = userText.toLowerCase();
  const rule = RULES.find((candidate) => candidate.keywords.some((keyword) => normalized.includes(keyword)));
  return pickRandom(rule ? rule.responses : FALLBACKS);
}

// Simule la latence réseau + le temps de "réflexion" d'un assistant réel.
export async function getCopilotMockResponse(userText: string): Promise<string> {
  const delay = 700 + Math.random() * 900;
  await new Promise((resolve) => setTimeout(resolve, delay));
  return buildReply(userText);
}

export function createCopilotMessage(role: CopilotMessageRole, content: string): CopilotMessage {
  return {
    id: `copilot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}
