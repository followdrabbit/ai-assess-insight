import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SecurityDomain, getAllSecurityDomains, DOMAIN_COLORS } from '@/lib/securityDomains';
import { frameworks as defaultFrameworks, Framework } from '@/lib/frameworks';
import { questions as defaultQuestions } from '@/lib/dataset';
import { getAllCustomFrameworks, getDisabledFrameworks } from '@/lib/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Brain, Cloud, Code, Shield, Lock, Database, Server, Key, ChevronRight, ChevronDown, Layers, BookOpen, AlertTriangle, CheckCircle2 } from 'lucide-react';

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  brain: Brain,
  cloud: Cloud,
  code: Code,
  shield: Shield,
  lock: Lock,
  database: Database,
  server: Server,
  key: Key
};

interface CascadeHierarchyProps {
  onDomainToggle?: (domainId: string, enabled: boolean) => void;
}

export function CascadeHierarchy({ onDomainToggle }: CascadeHierarchyProps) {
  const [domains, setDomains] = useState<SecurityDomain[]>([]);
  const [allFrameworks, setAllFrameworks] = useState<Framework[]>([]);
  const [disabledFrameworkIds, setDisabledFrameworkIds] = useState<Set<string>>(new Set());
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedFrameworks, setExpandedFrameworks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [secDomains, customFw, disabledIds] = await Promise.all([
        getAllSecurityDomains(),
        getAllCustomFrameworks(),
        getDisabledFrameworks()
      ]);
      
      setDomains(secDomains);
      setAllFrameworks([...defaultFrameworks, ...customFw as Framework[]]);
      setDisabledFrameworkIds(new Set(disabledIds));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group frameworks by security domain
  const frameworksByDomain = useMemo(() => {
    const grouped: Record<string, Framework[]> = {};
    domains.forEach(d => {
      grouped[d.domainId] = allFrameworks.filter(f => f.securityDomainId === d.domainId);
    });
    return grouped;
  }, [domains, allFrameworks]);

  // Count questions per framework
  const questionsPerFramework = useMemo(() => {
    const counts: Record<string, number> = {};
    allFrameworks.forEach(fw => {
      counts[fw.frameworkId] = defaultQuestions.filter(q => 
        q.frameworks.some(f => f.includes(fw.frameworkId) || f.includes(fw.shortName))
      ).length;
    });
    return counts;
  }, [allFrameworks]);

  // Get questions per domain
  const questionsPerDomain = useMemo(() => {
    const counts: Record<string, number> = {};
    domains.forEach(d => {
      counts[d.domainId] = defaultQuestions.filter(q => q.securityDomainId === d.domainId).length;
    });
    return counts;
  }, [domains]);

  // Calculate active frameworks per domain (enabled domain + not disabled framework)
  const activeFrameworksPerDomain = useMemo(() => {
    const counts: Record<string, number> = {};
    domains.forEach(d => {
      if (d.isEnabled) {
        counts[d.domainId] = (frameworksByDomain[d.domainId] || []).filter(
          fw => !disabledFrameworkIds.has(fw.frameworkId)
        ).length;
      } else {
        counts[d.domainId] = 0;
      }
    });
    return counts;
  }, [domains, frameworksByDomain, disabledFrameworkIds]);

  const toggleDomainExpand = (domainId: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domainId)) {
        next.delete(domainId);
      } else {
        next.add(domainId);
      }
      return next;
    });
  };

  const toggleFrameworkExpand = (frameworkId: string) => {
    setExpandedFrameworks(prev => {
      const next = new Set(prev);
      if (next.has(frameworkId)) {
        next.delete(frameworkId);
      } else {
        next.add(frameworkId);
      }
      return next;
    });
  };

  const handleToggleDomain = async (domain: SecurityDomain) => {
    const enabledCount = domains.filter(d => d.isEnabled).length;
    if (domain.isEnabled && enabledCount <= 1) {
      toast.error('Pelo menos um domínio deve estar habilitado');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('security_domains')
        .update({ is_enabled: !domain.isEnabled, updated_at: new Date().toISOString() })
        .eq('domain_id', domain.domainId);

      if (error) throw error;

      setDomains(prev => prev.map(d => 
        d.domainId === domain.domainId 
          ? { ...d, isEnabled: !d.isEnabled }
          : d
      ));

      toast.success(`Domínio ${!domain.isEnabled ? 'habilitado' : 'desabilitado'}`);
      onDomainToggle?.(domain.domainId, !domain.isEnabled);
    } catch (error) {
      console.error('Error toggling domain:', error);
      toast.error('Erro ao atualizar domínio');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-6 w-48 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-primary/20 flex items-center justify-center">
                <Layers className="h-3 w-3 text-primary" />
              </div>
              <span className="text-muted-foreground">Domínio de Segurança</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-amber-500/20 flex items-center justify-center">
                <Shield className="h-3 w-3 text-amber-600" />
              </div>
              <span className="text-muted-foreground">Frameworks</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-green-500/20 flex items-center justify-center">
                <BookOpen className="h-3 w-3 text-green-600" />
              </div>
              <span className="text-muted-foreground">Perguntas</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Quando um domínio é habilitado, seus frameworks ficam disponíveis. Frameworks ativos determinam quais perguntas são exibidas na avaliação.
          </p>
        </CardContent>
      </Card>

      {/* Hierarchy Tree */}
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3">
          {domains.map(domain => {
            const IconComp = ICON_COMPONENTS[domain.icon] || Shield;
            const colorStyles = DOMAIN_COLORS[domain.color];
            const domainFrameworks = frameworksByDomain[domain.domainId] || [];
            const isExpanded = expandedDomains.has(domain.domainId);
            const activeCount = activeFrameworksPerDomain[domain.domainId] || 0;
            const questionCount = questionsPerDomain[domain.domainId] || 0;

            return (
              <Card 
                key={domain.domainId}
                className={cn(
                  "transition-all",
                  !domain.isEnabled && "opacity-50 bg-muted/30"
                )}
              >
                <Collapsible open={isExpanded} onOpenChange={() => toggleDomainExpand(domain.domainId)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1">
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center",
                          colorStyles?.bg || "bg-primary/10"
                        )}>
                          <IconComp className={cn("h-5 w-5", colorStyles?.text || "text-primary")} />
                        </div>
                        <div className="text-left flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{domain.domainName}</CardTitle>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <CardDescription className="text-xs">
                            {domain.description}
                          </CardDescription>
                        </div>
                      </CollapsibleTrigger>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {domainFrameworks.length} frameworks
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {questionCount} perguntas
                            </Badge>
                          </div>
                          {domain.isEnabled && activeCount > 0 && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {activeCount} ativos
                            </p>
                          )}
                          {!domain.isEnabled && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Desabilitado
                            </p>
                          )}
                        </div>
                        <Switch
                          checked={domain.isEnabled}
                          onCheckedChange={() => handleToggleDomain(domain)}
                          disabled={saving}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4">
                      {domainFrameworks.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic py-3 text-center">
                          Nenhum framework cadastrado para este domínio
                        </p>
                      ) : (
                        <div className="ml-6 border-l-2 border-muted pl-4 space-y-2">
                          {domainFrameworks.map(fw => {
                            const isDisabled = disabledFrameworkIds.has(fw.frameworkId);
                            const isFrameworkExpanded = expandedFrameworks.has(fw.frameworkId);
                            const fwQuestionCount = questionsPerFramework[fw.frameworkId] || 0;
                            const isAvailable = domain.isEnabled && !isDisabled;

                            return (
                              <Collapsible 
                                key={fw.frameworkId}
                                open={isFrameworkExpanded}
                                onOpenChange={() => toggleFrameworkExpand(fw.frameworkId)}
                              >
                                <div className={cn(
                                  "p-3 rounded-lg border transition-all",
                                  isAvailable 
                                    ? "bg-background border-border hover:border-primary/30" 
                                    : "bg-muted/50 border-muted opacity-60"
                                )}>
                                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 rounded-md bg-amber-500/10 flex items-center justify-center">
                                        <Shield className="h-4 w-4 text-amber-600" />
                                      </div>
                                      <div className="text-left">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-sm">{fw.shortName}</span>
                                          {isFrameworkExpanded ? (
                                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                          ) : (
                                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                          )}
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-1">{fw.frameworkName}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <Badge 
                                        variant={isAvailable ? "default" : "secondary"} 
                                        className="text-xs"
                                      >
                                        {fwQuestionCount} perguntas
                                      </Badge>
                                      {isAvailable ? (
                                        <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Ativo
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs text-muted-foreground">
                                          Inativo
                                        </Badge>
                                      )}
                                    </div>
                                  </CollapsibleTrigger>
                                  
                                  <CollapsibleContent>
                                    <div className="mt-3 pt-3 border-t border-muted">
                                      <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                          <span className="text-muted-foreground">Versão:</span>
                                          <span className="ml-1">{fw.version}</span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Categoria:</span>
                                          <span className="ml-1 capitalize">{fw.category}</span>
                                        </div>
                                        <div className="col-span-2">
                                          <span className="text-muted-foreground">Público:</span>
                                          <span className="ml-1">{fw.targetAudience.join(', ')}</span>
                                        </div>
                                      </div>
                                      
                                      {isAvailable && fwQuestionCount > 0 && (
                                        <div className="mt-3 p-2 rounded bg-green-50 border border-green-200">
                                          <div className="flex items-center gap-2 text-xs text-green-700">
                                            <BookOpen className="h-3 w-3" />
                                            <span>
                                              {fwQuestionCount} perguntas disponíveis na avaliação
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {!domain.isEnabled && (
                                        <div className="mt-3 p-2 rounded bg-amber-50 border border-amber-200">
                                          <div className="flex items-center gap-2 text-xs text-amber-700">
                                            <AlertTriangle className="h-3 w-3" />
                                            <span>
                                              Habilite o domínio "{domain.shortName}" para ativar este framework
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Summary */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                {domains.filter(d => d.isEnabled).length}
              </p>
              <p className="text-xs text-muted-foreground">Domínios Ativos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">
                {Object.values(activeFrameworksPerDomain).reduce((a, b) => a + b, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Frameworks Disponíveis</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {defaultQuestions.filter(q => {
                  const enabledDomainIds = domains.filter(d => d.isEnabled).map(d => d.domainId);
                  return enabledDomainIds.includes(q.securityDomainId || '');
                }).length}
              </p>
              <p className="text-xs text-muted-foreground">Perguntas na Avaliação</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
