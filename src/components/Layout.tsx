import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { UserMenu } from '@/components/auth/UserMenu';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Layout() {
  const { t } = useTranslation();
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          {/* Header */}
          <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1" />
            <div className="text-xs text-muted-foreground hidden sm:block">
              {t('common.cloudSync')}
            </div>
            <ThemeToggle />
            <UserMenu />
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>

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