import { useState, useMemo } from 'react';
import { useAnswersStore } from '@/lib/stores';
import { frameworks, Framework } from '@/lib/frameworks';
import { questions } from '@/lib/dataset';
import { getQuestionFrameworkIds } from '@/lib/frameworks';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const categoryLabels: Record<string, { label: string; description: string }> = {
  core: { 
    label: 'Core', 
    description: 'Frameworks essenciais habilitados por padrão' 
  },
  'high-value': { 
    label: 'Alto Valor', 
    description: 'Frameworks complementares de alto impacto' 
  },
  'tech-focused': { 
    label: 'Técnico', 
    description: 'Frameworks com foco técnico/engenharia' 
  },
};

const audienceLabels: Record<string, string> = {
  Executive: 'Executivo',
  GRC: 'GRC',
  Engineering: 'Engenharia',
};

export default function Settings() {
  const { selectedFrameworks, setSelectedFrameworks, answers } = useAnswersStore();
  const [pendingFrameworks, setPendingFrameworks] = useState<string[]>(selectedFrameworks);
  const [hasChanges, setHasChanges] = useState(false);

  // Count questions per framework
  const questionCountByFramework = useMemo(() => {
    const counts: Record<string, number> = {};
    frameworks.forEach(fw => {
      counts[fw.frameworkId] = 0;
    });
    
    questions.forEach(q => {
      const fwIds = getQuestionFrameworkIds(q.frameworks);
      fwIds.forEach(fwId => {
        if (counts[fwId] !== undefined) {
          counts[fwId]++;
        }
      });
    });
    
    return counts;
  }, []);

  // Count answered questions per framework
  const answeredCountByFramework = useMemo(() => {
    const counts: Record<string, number> = {};
    frameworks.forEach(fw => {
      counts[fw.frameworkId] = 0;
    });
    
    answers.forEach((answer, questionId) => {
      const question = questions.find(q => q.questionId === questionId);
      if (question && answer.response) {
        const fwIds = getQuestionFrameworkIds(question.frameworks);
        fwIds.forEach(fwId => {
          if (counts[fwId] !== undefined) {
            counts[fwId]++;
          }
        });
      }
    });
    
    return counts;
  }, [answers]);

  // Group frameworks by category
  const frameworksByCategory = useMemo(() => {
    const grouped: Record<string, Framework[]> = {
      core: [],
      'high-value': [],
      'tech-focused': [],
    };
    
    frameworks.forEach(fw => {
      if (grouped[fw.category]) {
        grouped[fw.category].push(fw);
      }
    });
    
    return grouped;
  }, []);

  const toggleFramework = (frameworkId: string) => {
    setPendingFrameworks(prev => {
      const isEnabled = prev.includes(frameworkId);
      const newList = isEnabled
        ? prev.filter(id => id !== frameworkId)
        : [...prev, frameworkId];
      setHasChanges(true);
      return newList;
    });
  };

  const selectAll = () => {
    setPendingFrameworks(frameworks.map(f => f.frameworkId));
    setHasChanges(true);
  };

  const selectDefaults = () => {
    setPendingFrameworks(frameworks.filter(f => f.defaultEnabled).map(f => f.frameworkId));
    setHasChanges(true);
  };

  const selectNone = () => {
    setPendingFrameworks([]);
    setHasChanges(true);
  };

  const saveChanges = async () => {
    if (pendingFrameworks.length === 0) {
      toast.error('Selecione pelo menos um framework');
      return;
    }
    
    await setSelectedFrameworks(pendingFrameworks);
    setHasChanges(false);
    toast.success('Configurações salvas com sucesso');
  };

  const cancelChanges = () => {
    setPendingFrameworks(selectedFrameworks);
    setHasChanges(false);
  };

  const totalQuestions = useMemo(() => {
    const uniqueQuestions = new Set<string>();
    questions.forEach(q => {
      const fwIds = getQuestionFrameworkIds(q.frameworks);
      if (fwIds.some(id => pendingFrameworks.includes(id))) {
        uniqueQuestions.add(q.questionId);
      }
    });
    return uniqueQuestions.size;
  }, [pendingFrameworks]);

  const FrameworkCard = ({ fw }: { fw: Framework }) => {
    const isEnabled = pendingFrameworks.includes(fw.frameworkId);
    const questionCount = questionCountByFramework[fw.frameworkId] || 0;
    const answeredCount = answeredCountByFramework[fw.frameworkId] || 0;
    
    return (
      <Card 
        className={cn(
          "transition-all cursor-pointer",
          isEnabled 
            ? "border-primary bg-primary/5" 
            : "border-border opacity-60 hover:opacity-100"
        )}
        onClick={() => toggleFramework(fw.frameworkId)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                {fw.shortName}
                {fw.defaultEnabled && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    Padrão
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                v{fw.version}
              </CardDescription>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={() => toggleFramework(fw.frameworkId)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {fw.description}
          </p>
          
          <div className="flex flex-wrap gap-1 mb-3">
            {fw.targetAudience.map(audience => (
              <Badge key={audience} variant="outline" className="text-xs">
                {audienceLabels[audience] || audience}
              </Badge>
            ))}
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{questionCount} perguntas</span>
            {answeredCount > 0 && (
              <span className="text-primary">{answeredCount} respondidas</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Selecione os frameworks para avaliação e dashboards
          </p>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={cancelChanges}>
              Cancelar
            </Button>
            <Button size="sm" onClick={saveChanges}>
              Salvar Alterações
            </Button>
          </div>
        )}
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-2xl font-bold">{pendingFrameworks.length}</div>
                <div className="text-sm text-muted-foreground">Frameworks selecionados</div>
              </div>
              <div className="border-l border-border pl-6">
                <div className="text-2xl font-bold">{totalQuestions}</div>
                <div className="text-sm text-muted-foreground">Perguntas na avaliação</div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Selecionar Todos
              </Button>
              <Button variant="outline" size="sm" onClick={selectDefaults}>
                Restaurar Padrão
              </Button>
              <Button variant="outline" size="sm" onClick={selectNone}>
                Limpar Seleção
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frameworks by Category */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="core">
            Core ({frameworksByCategory.core.length})
          </TabsTrigger>
          <TabsTrigger value="high-value">
            Alto Valor ({frameworksByCategory['high-value'].length})
          </TabsTrigger>
          <TabsTrigger value="tech-focused">
            Técnico ({frameworksByCategory['tech-focused'].length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {Object.entries(frameworksByCategory).map(([category, fws]) => (
            <div key={category}>
              <div className="mb-3">
                <h3 className="font-semibold">{categoryLabels[category]?.label || category}</h3>
                <p className="text-sm text-muted-foreground">
                  {categoryLabels[category]?.description}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {fws.map(fw => (
                  <FrameworkCard key={fw.frameworkId} fw={fw} />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {Object.entries(frameworksByCategory).map(([category, fws]) => (
          <TabsContent key={category} value={category}>
            <div className="mb-3">
              <h3 className="font-semibold">{categoryLabels[category]?.label || category}</h3>
              <p className="text-sm text-muted-foreground">
                {categoryLabels[category]?.description}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {fws.map(fw => (
                <FrameworkCard key={fw.frameworkId} fw={fw} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Info about framework selection */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2">Sobre a seleção de frameworks</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• A seleção de frameworks afeta quais perguntas aparecem na avaliação</li>
            <li>• Os dashboards mostrarão métricas apenas dos frameworks selecionados</li>
            <li>• Algumas perguntas podem pertencer a múltiplos frameworks</li>
            <li>• Frameworks "Core" são recomendados para avaliações iniciais</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}