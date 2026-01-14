import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/assessment', label: 'Avaliação' },
    { path: '/reports', label: 'Relatórios' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-lg font-semibold tracking-tight">
              AI Security Assessment
            </h1>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="text-xs text-muted-foreground">
            Dados armazenados localmente
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="md:hidden border-b border-border bg-card p-2 flex gap-1 overflow-x-auto">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors",
              isActive 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Main content */}
      <main className="container py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 mt-8">
        <div className="container text-center text-xs text-muted-foreground">
          Todos os dados permanecem no seu navegador. Nenhum dado é enviado para servidores externos.
        </div>
      </footer>
    </div>
  );
}
