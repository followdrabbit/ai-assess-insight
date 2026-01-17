import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, ArrowRight, Layers, BookMarked, ClipboardList, Settings, Shield, BookOpen, Building2, FileDown, Trash2, Info, Sun, Volume2, Bell, Mic, Palette } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SearchableItemConfig {
  id: string;
  titleKey: string;
  descriptionKey: string;
  keywords: string[];
  tab: 'content' | 'assessment' | 'preferences' | 'system';
  sectionKey?: string;
  icon: React.ElementType;
}

interface SearchableItem {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  tab: 'content' | 'assessment' | 'preferences' | 'system';
  section?: string;
  icon: React.ElementType;
}

// Define all searchable items in settings with translation keys
const SEARCHABLE_ITEMS_CONFIG: SearchableItemConfig[] = [
  // Content Tab
  {
    id: 'domains',
    titleKey: 'settingsSearch.domains.title',
    descriptionKey: 'settingsSearch.domains.description',
    keywords: ['domínio', 'domain', 'security domain', 'ai security', 'cloud security', 'devsecops', 'habilitar', 'desabilitar', 'enable', 'disable'],
    tab: 'content',
    sectionKey: 'settingsSearch.domains.section',
    icon: Layers,
  },
  {
    id: 'frameworks-management',
    titleKey: 'settingsSearch.frameworks.title',
    descriptionKey: 'settingsSearch.frameworks.description',
    keywords: ['framework', 'nist', 'iso', 'cis', 'owasp', 'criar', 'create', 'importar', 'import', 'excluir', 'delete'],
    tab: 'content',
    sectionKey: 'settingsSearch.frameworks.section',
    icon: Shield,
  },
  {
    id: 'questions-management',
    titleKey: 'settingsSearch.questions.title',
    descriptionKey: 'settingsSearch.questions.description',
    keywords: ['pergunta', 'question', 'questão', 'criar', 'create', 'importar', 'import', 'versão', 'version', 'histórico', 'history'],
    tab: 'content',
    sectionKey: 'settingsSearch.questions.section',
    icon: BookOpen,
  },
  
  // Assessment Tab
  {
    id: 'assessment-info',
    titleKey: 'settingsSearch.assessmentInfo.title',
    descriptionKey: 'settingsSearch.assessmentInfo.description',
    keywords: ['nome', 'name', 'organização', 'organization', 'empresa', 'company', 'cadência', 'cadence', 'reavaliação', 'reassessment'],
    tab: 'assessment',
    sectionKey: 'settingsSearch.assessmentInfo.section',
    icon: Building2,
  },
  {
    id: 'framework-selection',
    titleKey: 'settingsSearch.frameworkSelection.title',
    descriptionKey: 'settingsSearch.frameworkSelection.description',
    keywords: ['ativar', 'activate', 'selecionar', 'select', 'escolher', 'choose', 'habilitar', 'enable', 'desabilitar', 'disable'],
    tab: 'assessment',
    sectionKey: 'settingsSearch.frameworkSelection.section',
    icon: Shield,
  },

  // Preferences Tab
  {
    id: 'appearance',
    titleKey: 'settingsSearch.appearance.title',
    descriptionKey: 'settingsSearch.appearance.description',
    keywords: ['aparência', 'appearance', 'tema', 'theme', 'claro', 'light', 'escuro', 'dark', 'idioma', 'language'],
    tab: 'preferences',
    sectionKey: 'settingsSearch.appearance.section',
    icon: Sun,
  },
  {
    id: 'voice-settings',
    titleKey: 'settingsSearch.voiceSettings.title',
    descriptionKey: 'settingsSearch.voiceSettings.description',
    keywords: ['voz', 'voice', 'fala', 'speech', 'velocidade', 'speed', 'rate', 'tom', 'pitch', 'volume', 'tts', 'síntese', 'synthesis'],
    tab: 'preferences',
    sectionKey: 'settingsSearch.voiceSettings.section',
    icon: Volume2,
  },
  {
    id: 'stt-config',
    titleKey: 'settingsSearch.sttConfig.title',
    descriptionKey: 'settingsSearch.sttConfig.description',
    keywords: ['stt', 'speech to text', 'reconhecimento', 'recognition', 'whisper', 'transcrição', 'transcription', 'microfone', 'microphone', 'api key'],
    tab: 'preferences',
    sectionKey: 'settingsSearch.sttConfig.section',
    icon: Mic,
  },
  {
    id: 'voice-profile',
    titleKey: 'settingsSearch.voiceProfile.title',
    descriptionKey: 'settingsSearch.voiceProfile.description',
    keywords: ['perfil', 'profile', 'biometria', 'biometric', 'voice profile', 'speaker', 'reconhecimento', 'recognition', 'verificação', 'verification'],
    tab: 'preferences',
    sectionKey: 'settingsSearch.voiceProfile.section',
    icon: Mic,
  },
  {
    id: 'notifications',
    titleKey: 'settingsSearch.notifications.title',
    descriptionKey: 'settingsSearch.notifications.description',
    keywords: ['notificação', 'notification', 'alerta', 'alert', 'email', 'semanal', 'weekly', 'digest', 'atualização', 'update', 'novidades', 'news'],
    tab: 'preferences',
    sectionKey: 'settingsSearch.notifications.section',
    icon: Bell,
  },
  
  // System Tab
  {
    id: 'export',
    titleKey: 'settingsSearch.export.title',
    descriptionKey: 'settingsSearch.export.description',
    keywords: ['exportar', 'export', 'excel', 'xlsx', 'download', 'backup', 'salvar', 'save'],
    tab: 'system',
    sectionKey: 'settingsSearch.export.section',
    icon: FileDown,
  },
  {
    id: 'demo-data',
    titleKey: 'settingsSearch.demoData.title',
    descriptionKey: 'settingsSearch.demoData.description',
    keywords: ['demo', 'demonstração', 'demonstration', 'exemplo', 'example', 'teste', 'test', 'gerar', 'generate', 'simular', 'simulate'],
    tab: 'system',
    sectionKey: 'settingsSearch.demoData.section',
    icon: FileDown,
  },
  {
    id: 'clear-answers',
    titleKey: 'settingsSearch.clearAnswers.title',
    descriptionKey: 'settingsSearch.clearAnswers.description',
    keywords: ['limpar', 'clear', 'apagar', 'erase', 'deletar', 'delete', 'remover', 'remove', 'respostas', 'answers', 'reset'],
    tab: 'system',
    sectionKey: 'settingsSearch.clearAnswers.section',
    icon: Trash2,
  },
  {
    id: 'restore-defaults',
    titleKey: 'settingsSearch.restoreDefaults.title',
    descriptionKey: 'settingsSearch.restoreDefaults.description',
    keywords: ['restaurar', 'restore', 'padrão', 'default', 'reset', 'resetar', 'inicial', 'initial', 'original'],
    tab: 'system',
    sectionKey: 'settingsSearch.restoreDefaults.section',
    icon: Trash2,
  },
  {
    id: 'about',
    titleKey: 'settingsSearch.about.title',
    descriptionKey: 'settingsSearch.about.description',
    keywords: ['sobre', 'about', 'versão', 'version', 'metodologia', 'methodology', 'informações', 'information', 'plataforma', 'platform', 'ajuda', 'help'],
    tab: 'system',
    sectionKey: 'settingsSearch.about.section',
    icon: Info,
  },
];

interface SettingsSearchProps {
  onNavigate: (tab: string, sectionId?: string) => void;
}

export function SettingsSearch({ onNavigate }: SettingsSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Tab configuration with translated labels
  const TAB_CONFIG = useMemo(() => ({
    content: { label: t('settings.contentTab'), icon: BookMarked, color: 'bg-primary/10 text-primary' },
    assessment: { label: t('settings.assessmentTab'), icon: ClipboardList, color: 'bg-amber-500/10 text-amber-700' },
    preferences: { label: t('settings.preferencesTab'), icon: Palette, color: 'bg-pink-500/10 text-pink-700' },
    system: { label: t('settings.systemTab'), icon: Settings, color: 'bg-gray-500/10 text-gray-700' },
  }), [t]);

  // Translate searchable items
  const searchableItems: SearchableItem[] = useMemo(() => {
    return SEARCHABLE_ITEMS_CONFIG.map(item => ({
      id: item.id,
      title: t(item.titleKey),
      description: t(item.descriptionKey),
      keywords: item.keywords,
      tab: item.tab,
      section: item.sectionKey ? t(item.sectionKey) : undefined,
      icon: item.icon,
    }));
  }, [t]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    
    const searchTerms = query.toLowerCase().split(' ').filter(Boolean);
    
    return searchableItems.filter(item => {
      const searchableText = [
        item.title,
        item.description,
        ...item.keywords,
        item.section || '',
      ].join(' ').toLowerCase();
      
      return searchTerms.every(term => searchableText.includes(term));
    }).slice(0, 6); // Limit to 6 results
  }, [query, searchableItems]);

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
          placeholder={t('settingsSearch.placeholder')}
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
              <p>{t('settingsSearch.noResults', { query })}</p>
              <p className="text-xs mt-1">{t('settingsSearch.tryTerms')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
