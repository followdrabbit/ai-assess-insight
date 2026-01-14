import { useState } from 'react';
import { frameworks, Framework } from '@/lib/frameworks';
import { useAnswersStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
  const { selectedFrameworks, setSelectedFrameworks } = useAnswersStore();
  const [localSelected, setLocalSelected] = useState<string[]>(selectedFrameworks);

  const toggleFramework = (frameworkId: string) => {
    setLocalSelected(prev => 
      prev.includes(frameworkId)
        ? prev.filter(id => id !== frameworkId)
        : [...prev, frameworkId]
    );
  };

  const handleStart = async () => {
    await setSelectedFrameworks(localSelected);
    onStartAssessment();
  };

  const selectAll = () => {
    setLocalSelected(frameworks.map(f => f.frameworkId));
  };

  const selectCore = () => {
    setLocalSelected(frameworks.filter(f => f.category === 'core').map(f => f.frameworkId));
  };

  const clearAll = () => {
    setLocalSelected([]);
  };

  // Group frameworks by category
  const coreFrameworks = frameworks.filter(f => f.category === 'core');
  const highValueFrameworks = frameworks.filter(f => f.category === 'high-value');
  const techFrameworks = frameworks.filter(f => f.category === 'tech-focused');

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Selecione os Frameworks</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Escolha quais frameworks de segurança de IA você deseja avaliar. 
          Cada framework possui seu próprio conjunto de perguntas e métricas.
          Os dashboards exibirão apenas os frameworks selecionados.
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={selectCore}>
          Apenas Fundamentais
        </Button>
        <Button variant="outline" size="sm" onClick={selectAll}>
          Selecionar Todos
        </Button>
        <Button variant="ghost" size="sm" onClick={clearAll}>
          Limpar
        </Button>
      </div>

      {/* Core Frameworks */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Frameworks Fundamentais
        </h3>
        <p className="text-xs text-muted-foreground">
          Recomendados para qualquer programa de segurança de IA
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          {coreFrameworks.map(fw => (
            <FrameworkCard
              key={fw.frameworkId}
              framework={fw}
              selected={localSelected.includes(fw.frameworkId)}
              onToggle={() => toggleFramework(fw.frameworkId)}
            />
          ))}
        </div>
      </div>

      {/* High Value Frameworks */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Frameworks de Alto Valor
        </h3>
        <p className="text-xs text-muted-foreground">
          Para organizações com programas de IA mais maduros
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          {highValueFrameworks.map(fw => (
            <FrameworkCard
              key={fw.frameworkId}
              framework={fw}
              selected={localSelected.includes(fw.frameworkId)}
              onToggle={() => toggleFramework(fw.frameworkId)}
            />
          ))}
        </div>
      </div>

      {/* Tech-Focused Frameworks */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Frameworks Técnicos
        </h3>
        <p className="text-xs text-muted-foreground">
          Focados em riscos específicos de implementação e APIs
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          {techFrameworks.map(fw => (
            <FrameworkCard
              key={fw.frameworkId}
              framework={fw}
              selected={localSelected.includes(fw.frameworkId)}
              onToggle={() => toggleFramework(fw.frameworkId)}
            />
          ))}
        </div>
      </div>

      {/* Start button */}
      <div className="flex justify-center pt-4">
        <Button 
          size="lg" 
          onClick={handleStart}
          disabled={localSelected.length === 0}
        >
          Iniciar Avaliação ({localSelected.length} framework{localSelected.length !== 1 ? 's' : ''})
        </Button>
      </div>

      {localSelected.length === 0 && (
        <p className="text-center text-sm text-destructive">
          Selecione pelo menos um framework para continuar
        </p>
      )}
    </div>
  );
}

interface FrameworkCardProps {
  framework: Framework;
  selected: boolean;
  onToggle: () => void;
}

function FrameworkCard({ framework, selected, onToggle }: FrameworkCardProps) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:border-primary/50",
        selected && "border-primary bg-primary/5"
      )}
      onClick={onToggle}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Checkbox checked={selected} />
            <div>
              <CardTitle className="text-base">{framework.shortName}</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {framework.frameworkName}
              </CardDescription>
            </div>
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
