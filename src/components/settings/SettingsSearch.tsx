import { useState, useMemo, useCallback } from 'react';
import { Search, X, ArrowRight, Layers, BookMarked, ClipboardList, Settings, Shield, BookOpen, Building2, FileDown, Trash2, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SearchableItem {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  tab: 'content' | 'assessment' | 'system';
  section?: string;
  icon: React.ElementType;
}

// Define all searchable items in settings
const SEARCHABLE_ITEMS: SearchableItem[] = [
  // Content Tab
  {
    id: 'domains',
    title: 'Domínios de Segurança',
    description: 'Gerenciar domínios como AI Security, Cloud Security, DevSecOps',
    keywords: ['domínio', 'security domain', 'ai security', 'cloud security', 'devsecops', 'habilitar', 'desabilitar'],
    tab: 'content',
    section: 'Domínios de Segurança',
    icon: Layers,
  },
  {
    id: 'frameworks-management',
    title: 'Frameworks',
    description: 'Criar, editar, importar e excluir frameworks de avaliação',
    keywords: ['framework', 'nist', 'iso', 'cis', 'owasp', 'criar framework', 'importar framework', 'excluir framework'],
    tab: 'content',
    section: 'Frameworks',
    icon: Shield,
  },
  {
    id: 'questions-management',
    title: 'Perguntas',
    description: 'Criar, editar, importar, versionar e pesquisar perguntas',
    keywords: ['pergunta', 'questão', 'criar pergunta', 'importar perguntas', 'versão', 'histórico'],
    tab: 'content',
    section: 'Perguntas',
    icon: BookOpen,
  },
  
  // Assessment Tab
  {
    id: 'assessment-info',
    title: 'Informações da Avaliação',
    description: 'Nome da avaliação, organização e cadência de reavaliação',
    keywords: ['nome', 'organização', 'empresa', 'cadência', 'reavaliação', 'mensal', 'trimestral', 'anual'],
    tab: 'assessment',
    section: 'Informações da Avaliação',
    icon: Building2,
  },
  {
    id: 'framework-selection',
    title: 'Selecionar Frameworks',
    description: 'Escolher frameworks ativos para a avaliação atual',
    keywords: ['ativar framework', 'selecionar', 'escolher', 'habilitar', 'desabilitar', 'todos', 'padrão'],
    tab: 'assessment',
    section: 'Selecionar Frameworks para Avaliação',
    icon: Shield,
  },
  
  // System Tab
  {
    id: 'export',
    title: 'Exportar Dados',
    description: 'Exportar respostas e configurações para Excel',
    keywords: ['exportar', 'excel', 'xlsx', 'download', 'backup', 'salvar'],
    tab: 'system',
    section: 'Exportar & Backup',
    icon: FileDown,
  },
  {
    id: 'demo-data',
    title: 'Dados de Demonstração',
    description: 'Gerar dados de exemplo para explorar dashboards',
    keywords: ['demo', 'demonstração', 'exemplo', 'teste', 'gerar dados', 'simular'],
    tab: 'system',
    section: 'Exportar & Backup',
    icon: FileDown,
  },
  {
    id: 'clear-answers',
    title: 'Limpar Respostas',
    description: 'Remover todas as respostas da avaliação',
    keywords: ['limpar', 'apagar', 'deletar', 'remover', 'respostas', 'reset'],
    tab: 'system',
    section: 'Zona de Perigo',
    icon: Trash2,
  },
  {
    id: 'restore-defaults',
    title: 'Restaurar Padrões',
    description: 'Resetar configurações e dados para o estado inicial',
    keywords: ['restaurar', 'padrão', 'reset', 'resetar', 'inicial', 'original'],
    tab: 'system',
    section: 'Zona de Perigo',
    icon: Trash2,
  },
  {
    id: 'about',
    title: 'Sobre a Plataforma',
    description: 'Informações sobre versão, metodologia e frameworks suportados',
    keywords: ['sobre', 'versão', 'metodologia', 'informações', 'plataforma', 'ajuda'],
    tab: 'system',
    section: 'Sobre a Plataforma',
    icon: Info,
  },
];

const TAB_CONFIG = {
  content: { label: 'Conteúdo', icon: BookMarked, color: 'bg-primary/10 text-primary' },
  assessment: { label: 'Avaliação', icon: ClipboardList, color: 'bg-amber-500/10 text-amber-700' },
  system: { label: 'Geral', icon: Settings, color: 'bg-gray-500/10 text-gray-700' },
};

interface SettingsSearchProps {
  onNavigate: (tab: string, sectionId?: string) => void;
}

export function SettingsSearch({ onNavigate }: SettingsSearchProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    
    const searchTerms = query.toLowerCase().split(' ').filter(Boolean);
    
    return SEARCHABLE_ITEMS.filter(item => {
      const searchableText = [
        item.title,
        item.description,
        ...item.keywords,
        item.section || '',
      ].join(' ').toLowerCase();
      
      return searchTerms.every(term => searchableText.includes(term));
    }).slice(0, 6); // Limit to 6 results
  }, [query]);

  const handleSelect = useCallback((item: SearchableItem) => {
    onNavigate(item.tab, item.id);
    setQuery('');
    setIsFocused(false);
  }, [onNavigate]);

  const handleClear = useCallback(() => {
    setQuery('');
  }, []);

  const showResults = isFocused && query.trim().length > 0;

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar configurações..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          className="pl-9 pr-8 h-9"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {results.length > 0 ? (
            <ScrollArea className="max-h-[320px]">
              <div className="p-1">
                {results.map((item) => {
                  const tabConfig = TAB_CONFIG[item.tab];
                  const Icon = item.icon;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className="w-full flex items-start gap-3 p-3 rounded-md hover:bg-accent transition-colors text-left group"
                    >
                      <div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0", tabConfig.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{item.title}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                            {tabConfig.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                        {item.section && (
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
                            → {item.section}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum resultado para "{query}"</p>
              <p className="text-xs mt-1">Tente termos como "framework", "exportar" ou "domínio"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
