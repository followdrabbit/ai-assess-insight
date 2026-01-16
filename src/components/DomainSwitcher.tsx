/**
 * DomainSwitcher - A compact component for switching between security domains
 * Used in dashboard headers to provide domain context
 */

import { useState, useEffect } from 'react';
import { useAnswersStore } from '@/lib/stores';
import { 
  SecurityDomain, 
  getEnabledSecurityDomains, 
  getDomainDisplayInfo,
  DEFAULT_SECURITY_DOMAINS
} from '@/lib/securityDomains';
import { getFrameworksBySecurityDomain } from '@/lib/frameworks';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Brain, Cloud, Code, Shield, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';

interface DomainSwitcherProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'default' | 'compact' | 'badge';
}

// Map icon names to components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  brain: Brain,
  cloud: Cloud,
  code: Code,
  shield: Shield
};

export function DomainSwitcher({ className, showLabel = true, variant = 'default' }: DomainSwitcherProps) {
  const { selectedSecurityDomain, setSelectedSecurityDomain } = useAnswersStore();
  const [domains, setDomains] = useState<SecurityDomain[]>(DEFAULT_SECURITY_DOMAINS);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    const loadDomains = async () => {
      try {
        const enabledDomains = await getEnabledSecurityDomains();
        setDomains(enabledDomains.length > 0 ? enabledDomains : DEFAULT_SECURITY_DOMAINS);
      } catch (error) {
        console.error('Error loading security domains:', error);
        setDomains(DEFAULT_SECURITY_DOMAINS);
      } finally {
        setIsInitialLoading(false);
      }
    };
    loadDomains();
  }, []);

  const currentDomain = domains.find(d => d.domainId === selectedSecurityDomain) || domains[0];
  const displayInfo = currentDomain ? getDomainDisplayInfo(currentDomain) : null;
  const IconComponent = currentDomain ? (iconMap[currentDomain.icon] || Shield) : Shield;

  const handleSelectDomain = async (domain: SecurityDomain) => {
    if (domain.domainId !== selectedSecurityDomain) {
      setIsChanging(true);
      try {
        await setSelectedSecurityDomain(domain.domainId);
        toast.success(`Domínio alterado para ${domain.domainName}`, {
          description: 'Os dados foram atualizados para refletir o novo contexto.',
          duration: 3000,
        });
      } finally {
        setTimeout(() => setIsChanging(false), 500);
      }
    }
  };

  // Only show loading skeleton on initial load, not when changing domains
  if (isInitialLoading) {
    return (
      <div className={cn("h-9 w-32 bg-muted animate-pulse rounded-md", className)} />
    );
  }

  if (variant === 'badge') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-6 sm:h-7 gap-1 sm:gap-1.5 px-1.5 sm:px-2 rounded-full",
              "transition-colors hover:bg-accent",
              displayInfo?.bgClass,
              displayInfo?.textClass,
              displayInfo?.borderClass,
              isChanging && "opacity-70",
              className
            )}
          >
            <IconComponent className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", isChanging && "animate-pulse")} />
            <span className="text-[10px] sm:text-xs font-medium">{currentDomain?.shortName}</span>
            <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 z-50">
          <DropdownMenuLabel>Domínio de Segurança</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {domains.map(domain => {
            const DomainIcon = iconMap[domain.icon] || Shield;
            const domainDisplayInfo = getDomainDisplayInfo(domain);
            const isSelected = domain.domainId === selectedSecurityDomain;
            
            return (
              <DropdownMenuItem 
                key={domain.domainId}
                onClick={() => handleSelectDomain(domain)}
                className="cursor-pointer"
              >
                <div className={cn(
                  "flex items-center gap-2 w-full",
                  isSelected && "font-medium"
                )}>
                  <div className={cn(
                    "p-1 rounded",
                    domainDisplayInfo.bgClass
                  )}>
                    <DomainIcon className={cn("h-3.5 w-3.5", domainDisplayInfo.textClass)} />
                  </div>
                  <span className="flex-1">{domain.domainName}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className={cn("gap-1.5", className)}
          >
            <IconComponent className={cn("h-4 w-4", displayInfo?.textClass)} />
            {currentDomain?.shortName}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Domínio de Segurança</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {domains.map(domain => {
            const DomainIcon = iconMap[domain.icon] || Shield;
            const domainDisplayInfo = getDomainDisplayInfo(domain);
            const isSelected = domain.domainId === selectedSecurityDomain;
            
            return (
              <DropdownMenuItem 
                key={domain.domainId}
                onClick={() => handleSelectDomain(domain)}
                className="cursor-pointer"
              >
                <div className={cn(
                  "flex items-center gap-2 w-full",
                  isSelected && "font-medium"
                )}>
                  <div className={cn(
                    "p-1 rounded",
                    domainDisplayInfo.bgClass
                  )}>
                    <DomainIcon className={cn("h-3.5 w-3.5", domainDisplayInfo.textClass)} />
                  </div>
                  <span className="flex-1">{domain.domainName}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "gap-2 border-2",
            displayInfo?.borderClass,
            className
          )}
        >
          <div className={cn(
            "p-1 rounded",
            displayInfo?.bgClass
          )}>
            <IconComponent className={cn("h-4 w-4", displayInfo?.textClass)} />
          </div>
          {showLabel && (
            <span className="font-medium">{currentDomain?.domainName}</span>
          )}
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Selecionar Domínio de Segurança</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {domains.map(domain => {
          const DomainIcon = iconMap[domain.icon] || Shield;
          const domainDisplayInfo = getDomainDisplayInfo(domain);
          const isSelected = domain.domainId === selectedSecurityDomain;
          const frameworkCount = getFrameworksBySecurityDomain(domain.domainId).length;
          
          return (
            <DropdownMenuItem 
              key={domain.domainId}
              onClick={() => handleSelectDomain(domain)}
              className="cursor-pointer py-2"
            >
              <div className={cn(
                "flex items-start gap-3 w-full",
                isSelected && "font-medium"
              )}>
                <div className={cn(
                  "p-1.5 rounded mt-0.5",
                  domainDisplayInfo.bgClass
                )}>
                  <DomainIcon className={cn("h-4 w-4", domainDisplayInfo.textClass)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{domain.domainName}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {frameworkCount} framework{frameworkCount !== 1 ? 's' : ''} disponíve{frameworkCount !== 1 ? 'is' : 'l'}
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * DomainBadge - A simple badge showing the current domain
 */
export function DomainBadge({ className }: { className?: string }) {
  const { selectedSecurityDomain } = useAnswersStore();
  const [currentDomain, setCurrentDomain] = useState<SecurityDomain | null>(null);

  useEffect(() => {
    const loadDomain = async () => {
      const domains = await getEnabledSecurityDomains();
      const domain = domains.find(d => d.domainId === selectedSecurityDomain);
      setCurrentDomain(domain || DEFAULT_SECURITY_DOMAINS.find(d => d.domainId === selectedSecurityDomain) || null);
    };
    loadDomain();
  }, [selectedSecurityDomain]);

  if (!currentDomain) return null;

  const displayInfo = getDomainDisplayInfo(currentDomain);
  const IconComponent = iconMap[currentDomain.icon] || Shield;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1.5",
        displayInfo.bgClass,
        displayInfo.textClass,
        displayInfo.borderClass,
        className
      )}
    >
      <IconComponent className="h-3 w-3" />
      {currentDomain.shortName}
    </Badge>
  );
}
