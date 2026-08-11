import { Lightbulb } from 'lucide-react';
import { UnderConstruction } from '@/components/layout/UnderConstruction';

export default function KnowledgePage() {
  return (
    <UnderConstruction
      icon={Lightbulb}
      title="Base de connaissances"
      description="Cette section est en cours de développement."
    />
  );
}
