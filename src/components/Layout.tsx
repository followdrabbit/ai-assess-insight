import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { UserMenu } from '@/components/auth/UserMenu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import { AIAssistantPanel } from '@/components/ai-assistant';

export default function Layout() {
  const { t } = useTranslation();
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          {/* Header - Mobile optimized */}
          <header className="sticky top-0 z-50 flex h-12 sm:h-14 items-center gap-2 sm:gap-4 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-2 sm:px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1" />
            <LanguageSelector />
            <ThemeToggle />
            <UserMenu />
          </header>

          {/* Main content - Mobile optimized padding */}
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
            <Outlet />
          </main>

          {/* AI Assistant FAB */}
          <AIAssistantPanel />

          {/* Footer */}
          <footer className="border-t border-border py-3 px-4">
            <div className="text-center text-xs text-muted-foreground">
              TrustLayer — {t('home.subtitle')}
            </div>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}