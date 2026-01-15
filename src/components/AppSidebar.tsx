import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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

const dashboardSubItems = [
  { path: '/dashboard/executive', label: 'Executivo', icon: Briefcase, description: 'CISO / Head de Segurança' },
  { path: '/dashboard/grc', label: 'GRC', icon: Scale, description: 'Governança, Riscos e Compliance' },
  { path: '/dashboard/specialist', label: 'Especialista', icon: Code, description: 'Arquiteto / Engenheiro' },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  
  const { selectedSecurityDomain, setSelectedSecurityDomain } = useAnswersStore();
  const [domains, setDomains] = useState<SecurityDomain[]>([]);
  const [currentDomain, setCurrentDomain] = useState<SecurityDomain | null>(null);

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

  const handleDomainChange = async (domainId: string) => {
    await setSelectedSecurityDomain(domainId);
    const domain = domains.find(d => d.domainId === domainId);
    setCurrentDomain(domain || null);
  };

  const isActive = (path: string) => location.pathname === path;
  const isDashboardActive = location.pathname.startsWith('/dashboard');

  const DomainIcon = currentDomain ? (ICON_COMPONENTS[currentDomain.icon] || Shield) : Shield;
  const domainColors = currentDomain ? (DOMAIN_COLORS[currentDomain.color] || DOMAIN_COLORS.blue) : DOMAIN_COLORS.blue;

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      {/* Domain Selector Header */}
      <SidebarHeader className="border-b border-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-2 px-2 py-2 rounded-md transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                isCollapsed && "justify-center px-0"
              )}
            >
              <div className={cn(
                "flex items-center justify-center rounded-md p-1.5",
                domainColors.bg
              )}>
                <DomainIcon className={cn("h-4 w-4", domainColors.text)} />
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium truncate">
                      {currentDomain?.shortName || 'Selecionar'}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {currentDomain?.domainName || 'Domínio de Segurança'}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align={isCollapsed ? "start" : "center"} 
            side={isCollapsed ? "right" : "bottom"}
            className="w-64"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Trocar Domínio de Segurança
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {domains.map((domain) => {
              const IconComp = ICON_COMPONENTS[domain.icon] || Shield;
              const colors = DOMAIN_COLORS[domain.color] || DOMAIN_COLORS.blue;
              const isSelected = domain.domainId === selectedSecurityDomain;
              
              return (
                <DropdownMenuItem
                  key={domain.domainId}
                  onClick={() => handleDomainChange(domain.domainId)}
                  className={cn(
                    "cursor-pointer gap-3 py-2.5",
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
              onClick={() => navigate('/settings')}
              className="cursor-pointer gap-3"
            >
              <Settings className="h-4 w-4" />
              <span className="text-sm">Gerenciar Domínios</span>
              <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Home */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/')}
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
                          onClick={() => navigate(item.path)}
                          className={cn(
                            "cursor-pointer gap-2",
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
                              onClick={() => navigate(item.path)}
                              isActive={isActive(item.path)}
                              className="cursor-pointer"
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
                  onClick={() => navigate('/assessment')}
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
                  onClick={() => navigate('/settings')}
                  isActive={isActive('/settings')}
                  tooltip="Configurações"
                >
                  <Settings className="h-4 w-4" />
                  <span>Configurações</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-3">
        {!isCollapsed && currentDomain && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <div className={cn(
              "w-2 h-2 rounded-full",
              domainColors.bg.replace('bg-', 'bg-').replace('-100', '-500')
            )} 
            style={{ 
              backgroundColor: currentDomain.color === 'purple' ? '#a855f7' :
                               currentDomain.color === 'blue' ? '#3b82f6' :
                               currentDomain.color === 'green' ? '#22c55e' :
                               currentDomain.color === 'orange' ? '#f97316' :
                               currentDomain.color === 'red' ? '#ef4444' :
                               currentDomain.color === 'yellow' ? '#eab308' : '#3b82f6'
            }}
            />
            <span className="truncate">{currentDomain.domainName}</span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
