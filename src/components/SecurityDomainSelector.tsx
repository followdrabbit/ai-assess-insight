/**
 * SecurityDomainSelector - Allows users to select a security domain
 * before proceeding to framework selection and assessment.
 */

import { useState, useEffect } from 'react';
import { useAnswersStore } from '@/lib/stores';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  SecurityDomain, 
  getEnabledSecurityDomains, 
  getDomainDisplayInfo,
  DEFAULT_SECURITY_DOMAINS
} from '@/lib/securityDomains';
import { getFrameworksBySecurityDomain } from '@/lib/frameworks';
import { Brain, Cloud, Code, Shield, ChevronRight } from 'lucide-react';

interface SecurityDomainSelectorProps {
  onDomainSelected: () => void;
}

// Map icon names to components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  brain: Brain,
  cloud: Cloud,
  code: Code,
  shield: Shield
};

export function SecurityDomainSelector({ onDomainSelected }: SecurityDomainSelectorProps) {
  const { selectedSecurityDomain, setSelectedSecurityDomain } = useAnswersStore();
  const [domains, setDomains] = useState<SecurityDomain[]>(DEFAULT_SECURITY_DOMAINS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDomains = async () => {
      setIsLoading(true);
      try {
        const enabledDomains = await getEnabledSecurityDomains();
        setDomains(enabledDomains.length > 0 ? enabledDomains : DEFAULT_SECURITY_DOMAINS);
      } catch (error) {
        console.error('Error loading security domains:', error);
        setDomains(DEFAULT_SECURITY_DOMAINS);
      } finally {
        setIsLoading(false);
      }
    };
    loadDomains();
  }, []);

  const handleSelectDomain = async (domainId: string) => {
    await setSelectedSecurityDomain(domainId);
    onDomainSelected();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando domínios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Selecione o Domínio de Segurança</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Escolha o domínio de segurança que deseja avaliar. Cada domínio possui seus próprios 
          frameworks e questionários específicos.
        </p>
      </div>

      {/* Domain Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {domains.map((domain) => {
          const displayInfo = getDomainDisplayInfo(domain);
          const IconComponent = iconMap[domain.icon] || Shield;
          const frameworksInDomain = getFrameworksBySecurityDomain(domain.domainId);
          const isSelected = selectedSecurityDomain === domain.domainId;

          return (
            <Card 
              key={domain.domainId}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]",
                isSelected && "ring-2 ring-primary shadow-lg",
                displayInfo.borderClass
              )}
              onClick={() => handleSelectDomain(domain.domainId)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={cn(
                    "p-3 rounded-lg",
                    displayInfo.bgClass
                  )}>
                    <IconComponent className={cn("h-6 w-6", displayInfo.textClass)} />
                  </div>
                  {isSelected && (
                    <Badge variant="default" className="text-xs">
                      Selecionado
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg mt-3">{domain.domainName}</CardTitle>
                <CardDescription className="text-sm">
                  {domain.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Frameworks available */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      Frameworks disponíveis:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {frameworksInDomain.slice(0, 4).map(fw => (
                        <Badge 
                          key={fw.frameworkId} 
                          variant="outline" 
                          className="text-[10px] font-normal"
                        >
                          {fw.shortName}
                        </Badge>
                      ))}
                      {frameworksInDomain.length > 4 && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          +{frameworksInDomain.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Select button */}
                  <Button 
                    variant={isSelected ? "default" : "outline"} 
                    className="w-full group"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectDomain(domain.domainId);
                    }}
                  >
                    {isSelected ? 'Continuar' : 'Selecionar'}
                    <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info text */}
      <p className="text-center text-xs text-muted-foreground">
        Você pode alternar entre domínios a qualquer momento. Os dados de cada domínio são mantidos separadamente.
      </p>
    </div>
  );
}
