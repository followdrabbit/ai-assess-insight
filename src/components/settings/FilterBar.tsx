import { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Filter, Search, X, LucideIcon } from 'lucide-react';

// Types for domain badges with icons
export interface DomainBadgeOption {
  id: string;
  label: string;
  shortLabel?: string;
  icon?: LucideIcon;
  color?: {
    bg?: string;
    text?: string;
    border?: string;
  };
  count?: number;
}

// Types for select filters
export interface SelectFilterOption {
  value: string;
  label: string;
}

export interface SelectFilterConfig {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  allLabel: string;
  options: SelectFilterOption[];
  width?: string;
}

// Props for the FilterBar component
interface FilterBarProps {
  // Search input
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;

  // Domain badge filters (horizontal pill filters)
  domainBadges?: {
    value: string;
    onChange: (value: string) => void;
    options: DomainBadgeOption[];
    allLabel?: string;
    showAllCount?: boolean;
    allCount?: number;
  };

  // Select dropdown filters
  selectFilters?: SelectFilterConfig[];

  // Clear all filters
  showClearButton?: boolean;
  onClearAll?: () => void;
  hasActiveFilters?: boolean;

  // Custom content
  extraContent?: ReactNode;

  // Styling
  className?: string;
  compact?: boolean;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  showSearch = true,
  domainBadges,
  selectFilters,
  showClearButton = true,
  onClearAll,
  hasActiveFilters,
  extraContent,
  className,
  compact = false,
}: FilterBarProps) {
  const hasAnyActiveFilter = hasActiveFilters ?? (
    (searchValue && searchValue.trim() !== '') ||
    (domainBadges && domainBadges.value !== 'all') ||
    (selectFilters && selectFilters.some(f => f.value !== 'all'))
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Domain Badge Filters */}
      {domainBadges && (
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex gap-2 flex-wrap">
            {/* All option */}
            <Badge
              variant={domainBadges.value === 'all' ? 'default' : 'outline'}
              className="cursor-pointer transition-all hover:scale-105"
              onClick={() => domainBadges.onChange('all')}
            >
              {domainBadges.allLabel || 'Todos'}
              {domainBadges.showAllCount && domainBadges.allCount !== undefined && (
                <span className="ml-1">({domainBadges.allCount})</span>
              )}
            </Badge>
            
            {/* Domain options */}
            {domainBadges.options.map(option => {
              const isSelected = domainBadges.value === option.id;
              const IconComp = option.icon;
              
              return (
                <Badge
                  key={option.id}
                  variant={isSelected ? 'default' : 'outline'}
                  className={cn(
                    "cursor-pointer flex items-center gap-1 transition-all hover:scale-105",
                    isSelected && option.color?.bg,
                    isSelected && option.color?.text
                  )}
                  onClick={() => domainBadges.onChange(option.id)}
                >
                  {IconComp && <IconComp className="h-3 w-3" />}
                  {option.shortLabel || option.label}
                  {option.count !== undefined && (
                    <span className="ml-0.5">({option.count})</span>
                  )}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Search and Select Filters Row */}
      {(showSearch || (selectFilters && selectFilters.length > 0)) && (
        <div className="flex gap-3 flex-wrap items-center">
          {/* Search Input */}
          {showSearch && onSearchChange && (
            <div className={cn("relative", compact ? "flex-1 min-w-[150px]" : "flex-1 min-w-[200px]")}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchValue && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Select Filters */}
          {selectFilters?.map(filter => (
            <Select key={filter.id} value={filter.value} onValueChange={filter.onChange}>
              <SelectTrigger className={cn(filter.width || "w-48")}>
                <SelectValue placeholder={filter.placeholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{filter.allLabel}</SelectItem>
                {filter.options.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

          {/* Clear All Button */}
          {showClearButton && hasAnyActiveFilter && onClearAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="h-4 w-4" />
              Limpar filtros
            </Button>
          )}

          {/* Extra Content */}
          {extraContent}
        </div>
      )}
    </div>
  );
}

// Helper hook for managing filter state
export function useFilterState<T extends Record<string, string>>(
  initialState: T
): [T, (key: keyof T, value: string) => void, () => void, boolean] {
  const [filters, setFilters] = useState<T>(initialState);

  const setFilter = (key: keyof T, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(initialState);
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    const initial = initialState[key as keyof T];
    return value !== initial && value !== '' && value !== 'all';
  });

  return [filters, setFilter, resetFilters, hasActiveFilters];
}

// Need to import useState for the hook
import { useState } from 'react';

// Preset configurations for common filter patterns
export const createSecurityDomainBadges = (
  securityDomains: Array<{
    domainId: string;
    shortName: string;
    icon: string;
    color: string;
    isEnabled: boolean;
  }>,
  iconMap: Record<string, React.ComponentType<{ className?: string }>>,
  colorMap: Record<string, { bg?: string; text?: string; border?: string }>,
  getCount?: (domainId: string) => number
): DomainBadgeOption[] => {
  return securityDomains
    .filter(d => d.isEnabled)
    .map(domain => ({
      id: domain.domainId,
      label: domain.shortName,
      icon: iconMap[domain.icon] as LucideIcon | undefined,
      color: colorMap[domain.color],
      count: getCount?.(domain.domainId),
    }));
};

// Active filter count indicator
export function ActiveFilterCount({ count, className }: { count: number; className?: string }) {
  if (count === 0) return null;
  
  return (
    <Badge 
      variant="secondary" 
      className={cn("ml-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]", className)}
    >
      {count}
    </Badge>
  );
}
