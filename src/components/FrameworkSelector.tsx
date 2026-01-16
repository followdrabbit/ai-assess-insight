import { useState, useMemo, useEffect } from 'react';
import { frameworks, Framework, getFrameworksBySecurityDomain } from '@/lib/frameworks';
import { useAnswersStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronDown, AlertTriangle, Lock, Info, Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  SecurityDomain, 
  getSecurityDomainById, 
  getDomainDisplayInfo,
  getAllSecurityDomains,
  DEFAULT_SECURITY_DOMAINS,
  DOMAIN_COLORS
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
  const [allDomains, setAllDomains] = useState<SecurityDomain[]>([]);
  const [showUnavailable, setShowUnavailable] = useState(false);
  
  // Load domain info
  useEffect(() => {
    const loadDomains = async () => {
      const domains = await getAllSecurityDomains();
      setAllDomains(domains);
      
      if (selectedSecurityDomain) {
        const domain = domains.find(d => d.domainId === selectedSecurityDomain) 
          || DEFAULT_SECURITY_DOMAINS.find(d => d.domainId === selectedSecurityDomain) 
          || null;
        setCurrentDomain(domain);
      }
    };
    loadDomains();
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

  // Get frameworks from disabled domains (to show as unavailable)
  const unavailableFrameworks = useMemo(() => {
    const disabledDomains = allDomains.filter(d => !d.isEnabled);
    const disabledDomainIds = disabledDomains.map(d => d.domainId);
    
    // Frameworks that belong to disabled domains
    const fromDisabledDomains = frameworks.filter(f => 
      f.securityDomainId && disabledDomainIds.includes(f.securityDomainId)
    );

    // Group by domain
    const grouped: { domain: SecurityDomain; frameworks: Framework[] }[] = [];
    disabledDomains.forEach(domain => {
      const domainFrameworks = fromDisabledDomains.filter(f => f.securityDomainId === domain.domainId);
      if (domainFrameworks.length > 0) {
        grouped.push({ domain, frameworks: domainFrameworks });
      }
    });

    return grouped;
  }, [allDomains]);

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

      {/* Unavailable Frameworks from Disabled Domains */}
      {unavailableFrameworks.length > 0 && (
        <Collapsible open={showUnavailable} onOpenChange={setShowUnavailable}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 hover:bg-muted/50 transition-colors">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground flex-1 text-left">
              {unavailableFrameworks.reduce((acc, g) => acc + g.frameworks.length, 0)} frameworks indisponíveis 
              (domínios desabilitados)
            </span>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              showUnavailable && "rotate-180"
            )} />
          </CollapsibleTrigger>
          
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Frameworks de domínios desabilitados</p>
                <p className="text-xs mt-1 opacity-80">
                  Para usar estes frameworks, habilite o domínio correspondente nas configurações.
                </p>
              </div>
            </div>

            {unavailableFrameworks.map(({ domain, frameworks: domainFws }) => {
              const colorStyles = DOMAIN_COLORS[domain.color];
              return (
                <div key={domain.domainId} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", colorStyles?.border, colorStyles?.text)}
                    >
                      <Lock className="h-3 w-3 mr-1" />
                      {domain.shortName}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {domainFws.length} framework{domainFws.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {domainFws.map(fw => (
                      <UnavailableFrameworkCard 
                        key={fw.frameworkId} 
                        framework={fw} 
                        domain={domain}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="text-center pt-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/settings">
                  Gerenciar Domínios nas Configurações
                </Link>
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
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

interface UnavailableFrameworkCardProps {
  framework: Framework;
  domain: SecurityDomain;
}

function UnavailableFrameworkCard({ framework, domain }: UnavailableFrameworkCardProps) {
  const colorStyles = DOMAIN_COLORS[domain.color];
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Card className="opacity-50 cursor-not-allowed bg-muted/30 border-dashed hover:opacity-70 transition-opacity">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded border-2 border-muted-foreground/30 flex items-center justify-center">
                    <Lock className="h-2.5 w-2.5 text-muted-foreground/50" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-muted-foreground">{framework.shortName}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {framework.frameworkName}
                    </CardDescription>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className="text-[10px] shrink-0 opacity-50"
                >
                  {categoryLabels[framework.category]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground line-clamp-2 opacity-70">
                {framework.description}
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                <span>Requer domínio "{domain.shortName}" habilitado</span>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs p-0 overflow-hidden"
          sideOffset={8}
        >
          <div className={cn(
            "px-3 py-2 border-b",
            colorStyles?.bg || "bg-muted"
          )}>
            <div className="flex items-center gap-2">
              <Lock className={cn("h-4 w-4", colorStyles?.text || "text-muted-foreground")} />
              <span className={cn("font-semibold text-sm", colorStyles?.text || "text-foreground")}>
                Framework Indisponível
              </span>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div>
              <p className="text-xs font-medium text-foreground">{framework.shortName}</p>
              <p className="text-xs text-muted-foreground">{framework.frameworkName}</p>
            </div>
            <div className="pt-2 border-t border-dashed">
              <p className="text-xs text-muted-foreground mb-1">
                <strong>Motivo:</strong> O domínio de segurança está desabilitado
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px]", colorStyles?.border, colorStyles?.text)}
                >
                  {domain.domainName}
                </Badge>
                <span className="text-[10px] text-destructive font-medium">
                  DESABILITADO
                </span>
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                <strong>Para habilitar:</strong>
              </p>
              <div className="flex items-start gap-1.5 mt-1">
                <Settings className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-xs text-muted-foreground">
                  Vá em Configurações → Taxonomia → Hierarquia e ative o domínio "{domain.shortName}"
                </span>
              </div>
            </div>
            {domain.description && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground italic">
                  "{domain.description}"
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
