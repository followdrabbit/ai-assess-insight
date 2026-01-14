import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  ChevronDown,
  Shield,
  Map,
  Database,
  Code,
  Scale,
  Lock,
  Eye,
  AlertTriangle,
  Users,
  Building2,
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
import { cn } from '@/lib/utils';
import taxonomy from '@/data/taxonomy.json';

const domainIcons: Record<string, React.ElementType> = {
  GOVERN: Shield,
  MAP: Map,
  DATA: Database,
  DEVELOP: Code,
  MEASURE: Scale,
  PROTECT: Lock,
  DETECT: Eye,
  RESPOND: AlertTriangle,
  SUPPLY: Building2,
  PEOPLE: Users,
};

const mainNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/assessment', label: 'Avaliação', icon: ClipboardCheck },
  { path: '/reports', label: 'Relatórios', icon: FileText },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  const handleNavigation = (path: string, domainId?: string, subcatId?: string) => {
    const params = new URLSearchParams();
    if (domainId) params.set('domain', domainId);
    if (subcatId) params.set('subcat', subcatId);
    const queryString = params.toString();
    navigate(queryString ? `${path}?${queryString}` : path);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          {!isCollapsed && (
            <span className="font-semibold text-sm tracking-tight">
              AI Security
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={isActive(item.path)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Domains with Subcategories */}
        <SidebarGroup>
          <SidebarGroupLabel>Domínios</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {taxonomy.domains.map((domain) => {
                const Icon = domainIcons[domain.domainId] || Shield;
                const subcats = taxonomy.subcategories.filter(
                  (s) => s.domainId === domain.domainId
                );
                const isCurrentDomain = location.search.includes(`domain=${domain.domainId}`);

                return (
                  <Collapsible
                    key={domain.domainId}
                    asChild
                    defaultOpen={isCurrentDomain}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={domain.domainName}
                          className={cn(
                            isCurrentDomain && 'bg-accent text-accent-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="truncate">{domain.domainName}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {subcats.map((subcat) => {
                            const isCurrentSubcat = location.search.includes(
                              `subcat=${subcat.subcatId}`
                            );
                            return (
                              <SidebarMenuSubItem key={subcat.subcatId}>
                                <SidebarMenuSubButton
                                  onClick={() =>
                                    handleNavigation(
                                      '/assessment',
                                      domain.domainId,
                                      subcat.subcatId
                                    )
                                  }
                                  isActive={isCurrentSubcat}
                                  className="cursor-pointer"
                                >
                                  <span className="truncate text-xs">
                                    {subcat.subcatName}
                                  </span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-3">
        {!isCollapsed && (
          <div className="text-[10px] text-muted-foreground text-center">
            Dados armazenados localmente
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
