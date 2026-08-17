import { Sparkles } from 'lucide-react';
import { UnderConstruction } from '@/components/layout/UnderConstruction';

export default function CopilotPage() {
  return (
    <UnderConstruction
      icon={Sparkles}
      title="Copilote IA"
      description="Bientôt, posez vos questions en langage naturel — « quels chantiers sont en retard budgétaire ? », « résume-moi les tickets bloquants de cette semaine » — et obtenez une réponse basée sur les données réelles de vos chantiers, tickets et budgets. Cette fonctionnalité est en cours de conception."
    />
  );
}
