import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { 
  QuestionVersion, 
  VERSION_TAG_OPTIONS,
  CHANGE_TYPE_LABELS
} from '@/lib/questionVersioning';
import { Search, Filter, X, Calendar as CalendarIcon, Tag, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface VersionFilters {
  searchText: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  changeTypes: string[];
  tags: string[];
}

const defaultFilters: VersionFilters = {
  searchText: '',
  dateFrom: undefined,
  dateTo: undefined,
  changeTypes: [],
  tags: []
};

interface VersionFiltersBarProps {
  filters: VersionFilters;
  onFiltersChange: (filters: VersionFilters) => void;
  versions: QuestionVersion[];
}

export function VersionFiltersBar({ filters, onFiltersChange, versions }: VersionFiltersBarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDateFromOpen, setIsDateFromOpen] = useState(false);
  const [isDateToOpen, setIsDateToOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchText) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.changeTypes.length > 0) count++;
    if (filters.tags.length > 0) count++;
    return count;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0;

  const clearFilters = () => {
    onFiltersChange(defaultFilters);
  };

  const toggleChangeType = (type: string) => {
    const newTypes = filters.changeTypes.includes(type)
      ? filters.changeTypes.filter(t => t !== type)
      : [...filters.changeTypes, type];
    onFiltersChange({ ...filters, changeTypes: newTypes });
  };

  const toggleTag = (tagId: string) => {
    const newTags = filters.tags.includes(tagId)
      ? filters.tags.filter(t => t !== tagId)
      : [...filters.tags, tagId];
    onFiltersChange({ ...filters, tags: newTags });
  };

  // Get unique tags from versions for the filter
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    versions.forEach(v => {
      v.tags?.forEach(t => tagSet.add(t));
    });
    return Array.from(tagSet);
  }, [versions]);

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar no histórico..."
            value={filters.searchText}
            onChange={(e) => onFiltersChange({ ...filters, searchText: e.target.value })}
            className="pl-9"
          />
          {filters.searchText && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => onFiltersChange({ ...filters, searchText: '' })}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filtros</h4>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Período</Label>
                <div className="flex gap-2">
                  <Popover open={isDateFromOpen} onOpenChange={setIsDateFromOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "flex-1 justify-start text-left font-normal h-8",
                          !filters.dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {filters.dateFrom ? format(filters.dateFrom, 'dd/MM/yy') : 'De'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date) => {
                          onFiltersChange({ ...filters, dateFrom: date });
                          setIsDateFromOpen(false);
                        }}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover open={isDateToOpen} onOpenChange={setIsDateToOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "flex-1 justify-start text-left font-normal h-8",
                          !filters.dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {filters.dateTo ? format(filters.dateTo, 'dd/MM/yy') : 'Até'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date) => {
                          onFiltersChange({ ...filters, dateTo: date });
                          setIsDateToOpen(false);
                        }}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {(filters.dateFrom || filters.dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs w-full"
                    onClick={() => onFiltersChange({ ...filters, dateFrom: undefined, dateTo: undefined })}
                  >
                    Limpar datas
                  </Button>
                )}
              </div>

              {/* Change Type */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Tipo de Alteração</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CHANGE_TYPE_LABELS).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => toggleChangeType(type)}
                      className={cn(
                        "px-2 py-1 rounded-md text-xs border transition-colors",
                        filters.changeTypes.includes(type)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted border-border"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {availableTags.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    Tags
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {VERSION_TAG_OPTIONS.filter(t => availableTags.includes(t.id)).map((option) => (
                      <button
                        key={option.id}
                        onClick={() => toggleTag(option.id)}
                        className={cn(
                          "px-2 py-1 rounded-md text-xs border transition-colors",
                          filters.tags.includes(option.id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : option.color
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">Filtros ativos:</span>
          
          {filters.searchText && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Busca: "{filters.searchText}"
              <button onClick={() => onFiltersChange({ ...filters, searchText: '' })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {filters.dateFrom && (
            <Badge variant="secondary" className="gap-1 text-xs">
              De: {format(filters.dateFrom, 'dd/MM/yyyy')}
              <button onClick={() => onFiltersChange({ ...filters, dateFrom: undefined })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {filters.dateTo && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Até: {format(filters.dateTo, 'dd/MM/yyyy')}
              <button onClick={() => onFiltersChange({ ...filters, dateTo: undefined })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {filters.changeTypes.map(type => (
            <Badge key={type} variant="secondary" className="gap-1 text-xs">
              {CHANGE_TYPE_LABELS[type]}
              <button onClick={() => toggleChangeType(type)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          {filters.tags.map(tagId => {
            const option = VERSION_TAG_OPTIONS.find(t => t.id === tagId);
            return (
              <Badge key={tagId} variant="secondary" className="gap-1 text-xs">
                {option?.label || tagId}
                <button onClick={() => toggleTag(tagId)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs">
            Limpar todos
          </Button>
        </div>
      )}
    </div>
  );
}

export function filterVersions(versions: QuestionVersion[], filters: VersionFilters): QuestionVersion[] {
  return versions.filter(version => {
    // Text search
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const matchesText = 
        version.questionText.toLowerCase().includes(searchLower) ||
        version.changeSummary?.toLowerCase().includes(searchLower) ||
        version.domainId.toLowerCase().includes(searchLower) ||
        version.annotations?.some(a => a.text.toLowerCase().includes(searchLower));
      
      if (!matchesText) return false;
    }

    // Date range
    const versionDate = new Date(version.createdAt);
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (versionDate < fromDate) return false;
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (versionDate > toDate) return false;
    }

    // Change type
    if (filters.changeTypes.length > 0) {
      if (!filters.changeTypes.includes(version.changeType)) return false;
    }

    // Tags
    if (filters.tags.length > 0) {
      const versionTags = version.tags || [];
      const hasMatchingTag = filters.tags.some(t => versionTags.includes(t));
      if (!hasMatchingTag) return false;
    }

    return true;
  });
}

export function useVersionFilters() {
  const [filters, setFilters] = useState<VersionFilters>(defaultFilters);
  
  return {
    filters,
    setFilters,
    resetFilters: () => setFilters(defaultFilters)
  };
}
