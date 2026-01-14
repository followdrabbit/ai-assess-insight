import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

export default function Layout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          {/* Header */}
          <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1" />
            <div className="text-xs text-muted-foreground">
              Dados armazenados localmente
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>

          {/* Footer */}
          <footer className="border-t border-border py-3 px-4">
            <div className="text-center text-xs text-muted-foreground">
              Todos os dados permanecem no seu navegador. Nenhum dado é enviado para servidores externos.
            </div>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}