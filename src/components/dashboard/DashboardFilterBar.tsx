import { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'neutral';
}

interface DashboardFilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  activeFilter?: string;
  onFilterChange?: (value: string) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  className?: string;
  children?: ReactNode;
}

const filterVariantClasses = {
  default: '',
  success: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-300',
  warning: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-300',
  danger: 'bg-red-50 text-red-700 hover:bg-red-100 border-red-300',
  neutral: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300',
};

export function DashboardFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters,
  activeFilter,
  onFilterChange,
  hasActiveFilters,
  onClearFilters,
  className,
  children,
}: DashboardFilterBarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {/* Search input */}
      {onSearchChange && (
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchValue || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 h-9"
          />
        </div>
      )}

      {/* Filter pills */}
      {filters && filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.value;
            const variantClass = filter.variant && !isActive 
              ? filterVariantClasses[filter.variant] 
              : '';
            
            return (
              <Badge
                key={filter.value}
                variant={isActive ? 'default' : 'outline'}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:scale-105",
                  !isActive && variantClass
                )}
                onClick={() => onFilterChange?.(filter.value)}
              >
                {filter.label}
                {filter.count !== undefined && ` (${filter.count})`}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Clear filters button */}
      {hasActiveFilters && onClearFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-7 text-xs gap-1"
        >
          <X className="h-3 w-3" />
          Limpar filtros
        </Button>
      )}

      {/* Additional actions */}
      {children}
    </div>
  );
}
