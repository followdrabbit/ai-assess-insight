import { useMemo } from 'react';
import { frameworks, Framework } from '@/lib/frameworks';
import { useAnswersStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface FrameworkSelectorProps {
  onStartAssessment: () => void;
}

const categoryLabels: Record<string, string> = {
  core: 'Fundamental',
  'high-value': 'Alto Valor',
  'tech-focused': 'Técnico',
};

const categoryColors: Record<string, string> = {
  core: 'bg-primary/10 text-primary',
  'high-value': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'tech-focused': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

export function FrameworkSelector({ onStartAssessment }: FrameworkSelectorProps) {
  const { selectedFrameworks } = useAnswersStore();

  // Show the frameworks that are enabled in Settings
  const enabledFrameworks = useMemo(() => {
    return frameworks.filter(f => selectedFrameworks.includes(f.frameworkId));
  }, [selectedFrameworks]);

  // Group enabled frameworks by category
  const coreFrameworks = enabledFrameworks.filter(f => f.category === 'core');
  const highValueFrameworks = enabledFrameworks.filter(f => f.category === 'high-value');
  const techFrameworks = enabledFrameworks.filter(f => f.category === 'tech-focused');

  // If no frameworks are enabled, show message to go to Settings
  if (enabledFrameworks.length === 0) {
    return (
      <div className="space-y-6 text-center py-12">
        <h2 className="text-2xl font-bold">Nenhum Framework Habilitado</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Não há frameworks habilitados para avaliação. Acesse as configurações para habilitar os frameworks desejados.
        </p>
        <Button asChild>
          <Link to="/settings">Ir para Configurações</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Frameworks Habilitados</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Os seguintes frameworks estão habilitados para esta avaliação. 
          Para alterar os frameworks disponíveis, acesse as{' '}
          <Link to="/settings" className="text-primary hover:underline">Configurações</Link>.
        </p>
      </div>

      {/* Core Frameworks */}
      {coreFrameworks.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Frameworks Fundamentais
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {coreFrameworks.map(fw => (
              <FrameworkCard key={fw.frameworkId} framework={fw} />
            ))}
          </div>
        </div>
      )}

      {/* High Value Frameworks */}
      {highValueFrameworks.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Frameworks de Alto Valor
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {highValueFrameworks.map(fw => (
              <FrameworkCard key={fw.frameworkId} framework={fw} />
            ))}
          </div>
        </div>
      )}

      {/* Tech-Focused Frameworks */}
      {techFrameworks.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Frameworks Técnicos
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {techFrameworks.map(fw => (
              <FrameworkCard key={fw.frameworkId} framework={fw} />
            ))}
          </div>
        </div>
      )}

      {/* Start button */}
      <div className="flex flex-col items-center gap-4 pt-4">
        <Button size="lg" onClick={onStartAssessment}>
          Iniciar Avaliação ({enabledFrameworks.length} framework{enabledFrameworks.length !== 1 ? 's' : ''})
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/settings">Alterar Frameworks</Link>
        </Button>
      </div>
    </div>
  );
}

interface FrameworkCardProps {
  framework: Framework;
}

function FrameworkCard({ framework }: FrameworkCardProps) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{framework.shortName}</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {framework.frameworkName}
            </CardDescription>
          </div>
          <Badge 
            variant="secondary" 
            className={cn("text-[10px] shrink-0", categoryColors[framework.category])}
          >
            {categoryLabels[framework.category]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground line-clamp-2">
          {framework.description}
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {framework.targetAudience.map(audience => (
            <Badge key={audience} variant="outline" className="text-[10px]">
              {audience}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
