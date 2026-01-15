import { useState, useMemo, useEffect } from 'react';
import { frameworks, Framework, getFrameworksBySecurityDomain } from '@/lib/frameworks';
import { useAnswersStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { 
  SecurityDomain, 
  getSecurityDomainById, 
  getDomainDisplayInfo,
  DEFAULT_SECURITY_DOMAINS
} from '@/lib/securityDomains';

interface FrameworkSelectorProps {
  onStartAssessment: () => void;
  onBackToDomainSelector?: () => void;
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

export function FrameworkSelector({ onStartAssessment, onBackToDomainSelector }: FrameworkSelectorProps) {
  const { enabledFrameworks, selectedFrameworks, setSelectedFrameworks, selectedSecurityDomain } = useAnswersStore();
  const [currentDomain, setCurrentDomain] = useState<SecurityDomain | null>(null);
  
  // Load domain info
  useEffect(() => {
    const loadDomain = async () => {
      if (selectedSecurityDomain) {
        const domain = await getSecurityDomainById(selectedSecurityDomain);
        setCurrentDomain(domain || DEFAULT_SECURITY_DOMAINS.find(d => d.domainId === selectedSecurityDomain) || null);
      }
    };
    loadDomain();
  }, [selectedSecurityDomain]);
  
  // Local state for user selection
  const [localSelected, setLocalSelected] = useState<string[]>(
    // Initialize with previously selected frameworks, filtered to only enabled ones
    selectedFrameworks.filter(id => enabledFrameworks.includes(id))
  );

  // Only show frameworks that are ENABLED by admin AND belong to the selected security domain
  const availableFrameworks = useMemo(() => {
    const domainFrameworks = getFrameworksBySecurityDomain(selectedSecurityDomain);
    const domainFrameworkIds = domainFrameworks.map(f => f.frameworkId);
    
    // Filter to frameworks that are both enabled AND in the current domain
    return frameworks.filter(f => 
      enabledFrameworks.includes(f.frameworkId) && 
      domainFrameworkIds.includes(f.frameworkId)
    );
  }, [enabledFrameworks, selectedSecurityDomain]);

  // Group available frameworks by category
  const coreFrameworks = availableFrameworks.filter(f => f.category === 'core');
  const highValueFrameworks = availableFrameworks.filter(f => f.category === 'high-value');
  const techFrameworks = availableFrameworks.filter(f => f.category === 'tech-focused');

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
    setLocalSelected(availableFrameworks.map(f => f.frameworkId));
  };

  const selectCore = () => {
    setLocalSelected(availableFrameworks.filter(f => f.category === 'core').map(f => f.frameworkId));
  };

  const clearAll = () => {
    setLocalSelected([]);
  };

  // Get domain display info for header styling
  const domainDisplayInfo = currentDomain ? getDomainDisplayInfo(currentDomain) : null;

  // If no frameworks are enabled by admin for this domain, show message
  if (availableFrameworks.length === 0) {
    return (
      <div className="space-y-6 text-center py-12">
        <h2 className="text-2xl font-bold">Nenhum Framework Disponível</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Não há frameworks habilitados para o domínio {currentDomain?.domainName || selectedSecurityDomain}. 
          O administrador precisa habilitar frameworks nas configurações.
        </p>
        <div className="flex gap-2 justify-center">
          {onBackToDomainSelector && (
            <Button variant="outline" onClick={onBackToDomainSelector}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
          )}
          <Button asChild>
            <Link to="/settings">Ir para Configurações</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Domain context header */}
      {currentDomain && (
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg border",
          domainDisplayInfo?.bgClass,
          domainDisplayInfo?.borderClass
        )}>
          {onBackToDomainSelector && (
            <Button variant="ghost" size="sm" onClick={onBackToDomainSelector} className="mr-2">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Domínio selecionado:</p>
            <p className={cn("font-semibold", domainDisplayInfo?.textClass)}>
              {currentDomain.domainName}
            </p>
          </div>
        </div>
      )}

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Selecione os Frameworks</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Escolha quais frameworks você deseja avaliar para {currentDomain?.shortName || 'este domínio'}. 
          Apenas os frameworks habilitados pelo administrador estão disponíveis.
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
      {coreFrameworks.length > 0 && (
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
      )}

      {/* High Value Frameworks */}
      {highValueFrameworks.length > 0 && (
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
      )}

      {/* Tech-Focused Frameworks */}
      {techFrameworks.length > 0 && (
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
      )}

      {/* Start button */}
      <div className="flex flex-col items-center gap-4 pt-4">
        <Button 
          size="lg" 
          onClick={handleStart}
          disabled={localSelected.length === 0}
        >
          Iniciar Avaliação ({localSelected.length} framework{localSelected.length !== 1 ? 's' : ''})
        </Button>
        
        {localSelected.length === 0 && (
          <p className="text-sm text-destructive">
            Selecione pelo menos um framework para continuar
          </p>
        )}

        <Button variant="link" size="sm" asChild className="text-muted-foreground">
          <Link to="/settings">Gerenciar frameworks disponíveis</Link>
        </Button>
      </div>
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
