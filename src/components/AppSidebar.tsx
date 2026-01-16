import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  ClipboardCheck,
  Shield,
  Home,
  ChevronDown,
  Briefcase,
  Scale,
  Code,
  Settings,
  Brain,
  Cloud,
  Lock,
  Database,
  Server,
  Key,
  ChevronRight,
  Check,
  User,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAnswersStore } from '@/lib/stores';
import { SecurityDomain, getAllSecurityDomains, DOMAIN_COLORS } from '@/lib/securityDomains';
import { toast } from 'sonner';

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

export function AppSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Close mobile sidebar after navigation
  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  const { selectedSecurityDomain, setSelectedSecurityDomain } = useAnswersStore();
  const [domains, setDomains] = useState<SecurityDomain[]>([]);
  const [currentDomain, setCurrentDomain] = useState<SecurityDomain | null>(null);

  const dashboardSubItems = [
    { path: '/dashboard/executive', label: t('navigation.executive'), icon: Briefcase, description: t('dashboard.executiveDesc') },
    { path: '/dashboard/grc', label: t('navigation.grc'), icon: Scale, description: t('dashboard.grcDesc') },
    { path: '/dashboard/specialist', label: t('navigation.specialist'), icon: Code, description: t('dashboard.specialistDesc') },
  ];

  useEffect(() => {
    const loadDomains = async () => {
      const data = await getAllSecurityDomains();
      setDomains(data.filter(d => d.isEnabled));
    };
    loadDomains();
  }, []);

  useEffect(() => {
    if (domains.length > 0 && selectedSecurityDomain) {
      const domain = domains.find(d => d.domainId === selectedSecurityDomain);
      setCurrentDomain(domain || domains[0]);
    } else if (domains.length > 0) {
      setCurrentDomain(domains[0]);
    }
  }, [domains, selectedSecurityDomain]);

  const handleDomainChange = async (domain: SecurityDomain) => {
    if (domain.domainId !== selectedSecurityDomain) {
      await setSelectedSecurityDomain(domain.domainId);
      setCurrentDomain(domain);
      toast.success(t('securityDomains.domainChanged', { domain: domain.domainName }), {
        description: t('securityDomains.dataUpdated'),
        duration: 3000,
      });
      if (isMobile) {
        setOpenMobile(false);
      }
    }
  };

  const isActive = (path: string) => location.pathname === path;
  const isDashboardActive = location.pathname.startsWith('/dashboard');

  const DomainIcon = currentDomain ? (ICON_COMPONENTS[currentDomain.icon] || Shield) : Shield;
  const domainColors = currentDomain ? (DOMAIN_COLORS[currentDomain.color] || DOMAIN_COLORS.blue) : DOMAIN_COLORS.blue;

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      {/* Clean Header with App Identity */}
      <SidebarHeader className="border-b border-border px-3 h-14 flex items-center">
        <div className={cn(
          "flex items-center gap-2",
          isCollapsed && "justify-center"
        )}>
          <div className="flex items-center justify-center rounded-lg bg-primary p-1.5">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">TrustLayer</div>
              <div className="text-[10px] text-muted-foreground">Security Governance</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Domain Context - Integrated as first navigation element */}
        <SidebarGroup>
          <SidebarGroupLabel>{t('navigation.context')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      tooltip={currentDomain?.domainName || t('securityDomains.title')}
                      className={cn(
                        "w-full transition-colors",
                        domainColors.bg,
                        "hover:opacity-90"
                      )}
                    >
                      <DomainIcon className={cn("h-4 w-4", domainColors.text)} />
                      {!isCollapsed && (
                        <>
                          <span className={cn("font-medium", domainColors.text)}>
                            {currentDomain?.shortName || t('common.select')}
                          </span>
                          <ChevronDown className={cn("ml-auto h-4 w-4", domainColors.text)} />
                        </>
                      )}
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="start" 
                    side={isCollapsed ? "right" : "bottom"}
                    className="w-64"
                  >
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      {t('securityDomains.switch')}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {domains.map((domain) => {
                      const IconComp = ICON_COMPONENTS[domain.icon] || Shield;
                      const colors = DOMAIN_COLORS[domain.color] || DOMAIN_COLORS.blue;
                      const isSelected = domain.domainId === selectedSecurityDomain;
                      
                      return (
                        <DropdownMenuItem
                          key={domain.domainId}
                          onClick={() => handleDomainChange(domain)}
                          className={cn(
                            "cursor-pointer gap-3 py-2.5 min-h-[48px]",
                            isSelected && "bg-accent"
                          )}
                        >
                          <div className={cn(
                            "flex items-center justify-center rounded-md p-1.5",
                            colors.bg
                          )}>
                            <IconComp className={cn("h-4 w-4", colors.text)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{domain.shortName}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {domain.description}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleNavigate('/settings')}
                      className="cursor-pointer gap-3 min-h-[44px]"
                    >
                      <Settings className="h-4 w-4" />
                      <span className="text-sm">Gerenciar Domínios</span>
                      <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Home */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleNavigate('/')}
                  isActive={isActive('/')}
                  tooltip="Home"
                >
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Dashboard with submenu - different behavior when collapsed */}
              {isCollapsed ? (
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton
                        tooltip="Dashboard"
                        className={cn(isDashboardActive && 'bg-accent text-accent-foreground')}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="min-w-[200px]">
                      {dashboardSubItems.map((item) => (
                        <DropdownMenuItem
                          key={item.path}
                          onClick={() => handleNavigate(item.path)}
                          className={cn(
                            "cursor-pointer gap-2 min-h-[44px]",
                            isActive(item.path) && "bg-accent text-accent-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span>{item.label}</span>
                            <span className="text-xs text-muted-foreground">{item.description}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ) : (
                <Collapsible
                  asChild
                  defaultOpen={isDashboardActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip="Dashboard"
                        className={cn(isDashboardActive && 'bg-accent text-accent-foreground')}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {dashboardSubItems.map((item) => (
                          <SidebarMenuSubItem key={item.path}>
                            <SidebarMenuSubButton
                              onClick={() => handleNavigate(item.path)}
                              isActive={isActive(item.path)}
                              className="cursor-pointer min-h-[44px] md:min-h-0"
                            >
                              <item.icon className="h-3.5 w-3.5" />
                              <span>{item.label}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {/* Assessment */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleNavigate('/assessment')}
                  isActive={isActive('/assessment')}
                  tooltip="Avaliação"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  <span>Avaliação</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Settings */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleNavigate('/settings')}
                  isActive={isActive('/settings')}
                  tooltip="Configurações"
                >
                  <Settings className="h-4 w-4" />
                  <span>Configurações</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Profile */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleNavigate('/profile')}
                  isActive={isActive('/profile')}
                  tooltip="Meu Perfil"
                >
                  <User className="h-4 w-4" />
                  <span>Meu Perfil</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
