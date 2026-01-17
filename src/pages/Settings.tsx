import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnswersStore } from '@/lib/stores';
import { frameworks, Framework } from '@/lib/frameworks';
import { questions } from '@/lib/dataset';
import { getQuestionFrameworkIds } from '@/lib/frameworks';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSyncedSpeechSynthesis } from '@/hooks/useSyncedSpeechSynthesis';
import { useVoiceSettings } from '@/contexts/VoiceSettingsContext';
import { STTProviderType } from '@/lib/sttProviders';
import { STTConfigurationCard } from '@/components/settings/STTConfigurationCard';
import { VoiceProfileCard } from '@/components/settings/VoiceProfileCard';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { exportAnswersToXLSX, downloadXLSX, generateExportFilename } from '@/lib/xlsxExport';
import { FrameworkManagement } from '@/components/settings/FrameworkManagement';
import { QuestionManagement } from '@/components/settings/QuestionManagement';
import { DomainManagement } from '@/components/settings/DomainManagement';
import { SettingsSearch } from '@/components/settings/SettingsSearch';
import { AnimatedCard, AnimatedSectionCard, AnimatedStatsCard } from '@/components/settings/AnimatedCard';
import { StaggerContainer, StaggerItem, staggerItemVariants } from '@/components/settings/AnimatedTabContent';
import { 
  Layers, 
  BookMarked, 
  ClipboardList, 
  Cog,
  Settings2, 
  FileDown, 
  Trash2, 
  RefreshCw, 
  Building2, 
  Shield, 
  Home, 
  ChevronRight,
  BookOpen,
  Database,
  Info,
  CheckCircle2,
  Activity,
  Server,
  Bot,
  Sun,
  Moon,
  Monitor,
  Globe,
  Volume2,
  Mic,
  Play,
  Bell,
  Palette
} from 'lucide-react';
import { AuditLogsPanel } from '@/components/settings/AuditLogsPanel';
import { SIEMIntegrationsPanel } from '@/components/settings/SIEMIntegrationsPanel';
import { SIEMHealthPanel } from '@/components/settings/SIEMHealthPanel';
import { AIProvidersPanel } from '@/components/settings/AIProvidersPanel';

// Animation variants for tab content
const tabContentVariants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 1, 1] as const,
    },
  },
};

const LANGUAGES = [
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'es-ES', name: 'Español (España)', flag: '🇪🇸' },
] as const;

interface NotificationPreferences {
  notify_assessment_updates: boolean;
  notify_security_alerts: boolean;
  notify_weekly_digest: boolean;
  notify_new_features: boolean;
}

interface VoiceSettings {
  voice_language: string;
  voice_rate: number;
  voice_pitch: number;
  voice_volume: number;
  voice_name: string | null;
  voice_auto_speak: boolean;
}

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { voices, speak, stop, isSpeaking } = useSyncedSpeechSynthesis();
  const { updateSettings: updateVoiceSettingsContext } = useVoiceSettings();
  
  // Tab configuration with clear labels
  const TAB_CONFIG = {
    content: { 
      label: t('settings.contentTab'), 
      icon: BookMarked,
      description: t('settings.manageContentDesc')
    },
    assessment: { 
      label: t('settings.assessmentTab'), 
      icon: ClipboardList,
      description: t('settings.configureAssessmentDesc')
    },
    preferences: {
      label: t('settings.preferencesTab'),
      icon: Palette,
      description: t('settings.preferencesDesc')
    },
    system: { 
      label: t('settings.systemTab'), 
      icon: Cog,
      description: t('settings.exportAndGeneralDesc')
    },
    audit: {
      label: t('auditLogs.title'),
      icon: Activity,
      description: t('auditLogs.description')
    },
    siem: {
      label: t('siem.tabTitle'),
      icon: Server,
      description: t('siem.tabDescription')
    },
    ai: {
      label: t('aiProviders.tabTitle', 'Assistente IA'),
      icon: Bot,
      description: t('aiProviders.tabDescription', 'Configure provedores de IA')
    },
  };

  const audienceLabels: Record<string, string> = {
    Executive: t('dashboard.executive'),
    GRC: t('dashboard.grc'),
    Engineering: t('settings.engineering'),
  };
  const { enabledFrameworks, setEnabledFrameworks, answers, clearAnswers, generateDemoData } = useAnswersStore();
  const [pendingFrameworks, setPendingFrameworks] = useState<string[]>(enabledFrameworks);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [assessmentName, setAssessmentName] = useState(t('settings.defaultAssessmentName'));
  const [organizationName, setOrganizationName] = useState('');
  const [reassessmentInterval, setReassessmentInterval] = useState('quarterly');
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

  // Preferences state
  const [language, setLanguage] = useState('pt-BR');
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    notify_assessment_updates: true,
    notify_security_alerts: true,
    notify_weekly_digest: false,
    notify_new_features: true,
  });
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    voice_language: 'pt-BR',
    voice_rate: 1.0,
    voice_pitch: 1.0,
    voice_volume: 1.0,
    voice_name: null,
    voice_auto_speak: false,
  });
  const [sttSettings, setSttSettings] = useState({
    stt_provider: 'web-speech-api' as STTProviderType,
    stt_api_key: null as string | null,
    stt_model: 'whisper-1',
    stt_endpoint_url: null as string | null,
  });
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);
  const [savingSTT, setSavingSTT] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(true);

  // Load preferences from profile
  useEffect(() => {
    if (!user) {
      setPreferencesLoading(false);
      return;
    }

    async function loadPreferences() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('language, notify_assessment_updates, notify_security_alerts, notify_weekly_digest, notify_new_features, voice_language, voice_rate, voice_pitch, voice_volume, voice_name, voice_auto_speak, stt_provider, stt_api_key_encrypted, stt_model, stt_endpoint_url')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error loading preferences:', error);
        } else if (data) {
          setLanguage((data as any).language || 'pt-BR');
          setNotifications({
            notify_assessment_updates: data.notify_assessment_updates ?? true,
            notify_security_alerts: data.notify_security_alerts ?? true,
            notify_weekly_digest: data.notify_weekly_digest ?? false,
            notify_new_features: data.notify_new_features ?? true,
          });
          setVoiceSettings({
            voice_language: (data as any).voice_language || 'pt-BR',
            voice_rate: Number((data as any).voice_rate) || 1.0,
            voice_pitch: Number((data as any).voice_pitch) || 1.0,
            voice_volume: Number((data as any).voice_volume) || 1.0,
            voice_name: (data as any).voice_name || null,
            voice_auto_speak: (data as any).voice_auto_speak ?? false,
          });
          setSttSettings({
            stt_provider: ((data as any).stt_provider as STTProviderType) || 'web-speech-api',
            stt_api_key: (data as any).stt_api_key_encrypted || null,
            stt_model: (data as any).stt_model || 'whisper-1',
            stt_endpoint_url: (data as any).stt_endpoint_url || null,
          });
        }
      } catch (err) {
        console.error('Error loading preferences:', err);
      } finally {
        setPreferencesLoading(false);
      }
    }

    loadPreferences();
  }, [user]);

  // Save language preference
  const handleSaveLanguage = async (newLanguage: string) => {
    if (!user) return;

    const previousLanguage = language;
    setLanguage(newLanguage);
    setSavingLanguage(true);

    try {
      i18n.changeLanguage(newLanguage);

      const { error } = await supabase
        .from('profiles')
        .update({
          language: newLanguage,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      const langName = LANGUAGES.find(l => l.code === newLanguage)?.name || newLanguage;
      toast.success(t('profile.languageChanged', { language: langName }));
    } catch (err: any) {
      setLanguage(previousLanguage);
      i18n.changeLanguage(previousLanguage);
      toast.error(err.message || t('errors.saveLanguage'));
    } finally {
      setSavingLanguage(false);
    }
  };

  // Save notification preference
  const handleSaveNotifications = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) return;

    const updatedNotifications = { ...notifications, [key]: value };
    setNotifications(updatedNotifications);
    setSavingNotifications(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          [key]: value,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(t('settings.preferenceSaved', 'Preferência salva!'));
    } catch (err: any) {
      setNotifications(notifications);
      toast.error(err.message || 'Erro ao salvar preferência');
    } finally {
      setSavingNotifications(false);
    }
  };

  // Save voice setting
  const handleSaveVoiceSetting = async <K extends keyof VoiceSettings>(key: K, value: VoiceSettings[K]) => {
    if (!user) return;

    const previousValue = voiceSettings[key];
    setVoiceSettings(prev => ({ ...prev, [key]: value }));
    setSavingVoice(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          [key]: value,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      updateVoiceSettingsContext({ [key]: value });

      toast.success(t('profile.voiceSettingsSaved', 'Configuração de voz salva!'));
    } catch (err: any) {
      setVoiceSettings(prev => ({ ...prev, [key]: previousValue }));
      toast.error(err.message || t('errors.saveVoiceSettings', 'Erro ao salvar configuração de voz'));
    } finally {
      setSavingVoice(false);
    }
  };

  // Test voice
  const testVoice = () => {
    const voice = voices.find(v => v.name === voiceSettings.voice_name) ||
                  voices.find(v => v.lang === voiceSettings.voice_language) ||
                  voices[0];

    const testText = voiceSettings.voice_language.startsWith('pt')
      ? 'Olá! Esta é uma demonstração das configurações de voz.'
      : voiceSettings.voice_language.startsWith('es')
      ? '¡Hola! Esta es una demostración de la configuración de voz.'
      : 'Hello! This is a demonstration of the voice settings.';

    if (isSpeaking) {
      stop();
    } else {
      speak(testText, {
        voice,
        rate: voiceSettings.voice_rate,
        pitch: voiceSettings.voice_pitch,
        volume: voiceSettings.voice_volume,
      });
    }
  };

  // Save STT setting
  const handleSaveSTTSetting = async (key: string, value: string | null) => {
    if (!user) return;

    const dbKey = key === 'stt_api_key' ? 'stt_api_key_encrypted' : key;
    setSavingSTT(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          [dbKey]: value,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSttSettings(prev => ({ ...prev, [key]: value }));
      updateVoiceSettingsContext({ [key]: value } as any);

      toast.success(t('profile.sttSettingsSaved', 'Configuração de STT salva!'));
    } catch (err: any) {
      toast.error(err.message || t('errors.saveSTTSettings', 'Erro ao salvar configuração de STT'));
    } finally {
      setSavingSTT(false);
    }
  };

  // Filter voices by selected language
  const filteredVoices = voices.filter(v => v.lang.startsWith(voiceSettings.voice_language.split('-')[0]));

  // Refs for scrolling to sections
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Handle search navigation
  const handleSearchNavigate = useCallback((tab: string, sectionId?: string) => {
    setActiveTab(tab);
    
    if (sectionId) {
      setHighlightedSection(sectionId);
      
      // Wait for tab change to render, then scroll
      setTimeout(() => {
        const element = sectionRefs.current[sectionId];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Clear highlight after animation
        setTimeout(() => setHighlightedSection(null), 2000);
      }, 100);
    }
  }, []);

  // Helper to register section refs
  const setSectionRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current[id] = el;
  }, []);

  // Count questions per framework
  const questionCountByFramework = useMemo(() => {
    const counts: Record<string, number> = {};
    frameworks.forEach(fw => {
      counts[fw.frameworkId] = 0;
    });
    
    questions.forEach(q => {
      const fwIds = getQuestionFrameworkIds(q.frameworks);
      fwIds.forEach(fwId => {
        if (counts[fwId] !== undefined) {
          counts[fwId]++;
        }
      });
    });
    
    return counts;
  }, []);

  // Count answered questions per framework
  const answeredCountByFramework = useMemo(() => {
    const counts: Record<string, number> = {};
    frameworks.forEach(fw => {
      counts[fw.frameworkId] = 0;
    });
    
    answers.forEach((answer, questionId) => {
      const question = questions.find(q => q.questionId === questionId);
      if (question && answer.response) {
        const fwIds = getQuestionFrameworkIds(question.frameworks);
        fwIds.forEach(fwId => {
          if (counts[fwId] !== undefined) {
            counts[fwId]++;
          }
        });
      }
    });
    
    return counts;
  }, [answers]);

  const toggleFramework = (frameworkId: string) => {
    setPendingFrameworks(prev => {
      const isEnabled = prev.includes(frameworkId);
      const newList = isEnabled
        ? prev.filter(id => id !== frameworkId)
        : [...prev, frameworkId];
      setHasChanges(true);
      return newList;
    });
  };

  const selectAll = () => {
    setPendingFrameworks(frameworks.map(f => f.frameworkId));
    setHasChanges(true);
  };

  const selectDefaults = () => {
    setPendingFrameworks(frameworks.filter(f => f.defaultEnabled).map(f => f.frameworkId));
    setHasChanges(true);
  };

  const selectNone = () => {
    setPendingFrameworks([]);
    setHasChanges(true);
  };

  const saveChanges = async () => {
    if (pendingFrameworks.length === 0) {
      toast.error(t('settings.selectAtLeastOne'));
      return;
    }
    
    await setEnabledFrameworks(pendingFrameworks);
    setHasChanges(false);
    toast.success(t('settings.settingsSaved'));
  };

  const cancelChanges = () => {
    setPendingFrameworks(enabledFrameworks);
    setHasChanges(false);
  };

  const totalQuestions = useMemo(() => {
    const uniqueQuestions = new Set<string>();
    questions.forEach(q => {
      const fwIds = getQuestionFrameworkIds(q.frameworks);
      if (fwIds.some(id => pendingFrameworks.includes(id))) {
        uniqueQuestions.add(q.questionId);
      }
    });
    return uniqueQuestions.size;
  }, [pendingFrameworks]);

  const totalAnswered = answers.size;
  const lastUpdated = answers.size > 0 
    ? Array.from(answers.values()).reduce((latest, answer) => {
        const answerDate = new Date(answer.updatedAt);
        return answerDate > latest ? answerDate : latest;
      }, new Date(0))
    : null;

  const handleExportData = async () => {
    try {
      const blob = await exportAnswersToXLSX(answers);
      const filename = generateExportFilename();
      downloadXLSX(blob, filename);
      toast.success(t('settings.exportSuccess'));
    } catch (error) {
      toast.error(t('settings.exportError'));
      console.error(error);
    }
  };

  const handleClearAnswers = async () => {
    await clearAnswers();
    toast.success(t('settings.answersCleared'));
  };

  const handleGenerateDemo = async () => {
    await generateDemoData();
    toast.success(t('settings.demoGenerated'));
  };

  const FrameworkCard = ({ fw }: { fw: Framework }) => {
    const isEnabled = pendingFrameworks.includes(fw.frameworkId);
    const questionCount = questionCountByFramework[fw.frameworkId] || 0;
    const answeredCount = answeredCountByFramework[fw.frameworkId] || 0;
    
    return (
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        whileHover={{ 
          scale: 1.02, 
          y: -2,
          transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }
        }}
        whileTap={{ scale: 0.98 }}
        className="cursor-pointer"
        onClick={() => toggleFramework(fw.frameworkId)}
      >
        <Card 
          className={cn(
            "transition-colors h-full",
            isEnabled 
              ? "border-primary bg-primary/5 shadow-md" 
              : "border-border opacity-70 hover:opacity-100 hover:border-primary/50"
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <CardTitle className="text-base flex items-center gap-2">
                  {fw.shortName}
                  {fw.defaultEnabled && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {t('common.default')}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  v{fw.version}
                </CardDescription>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={() => toggleFramework(fw.frameworkId)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {fw.description}
            </p>
            
            <div className="flex flex-wrap gap-1 mb-3">
              {fw.targetAudience.map(audience => (
                <Badge key={audience} variant="outline" className="text-xs">
                  {audienceLabels[audience] || audience}
                </Badge>
              ))}
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{questionCount} {t('settings.questions').toLowerCase()}</span>
              {answeredCount > 0 && (
                <span className="text-primary">{answeredCount} {t('common.answered')}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <Home className="h-3.5 w-3.5" />
                {t('navigation.home')}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-3.5 w-3.5" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-1.5 font-medium">
              <Settings2 className="h-3.5 w-3.5" />
              {t('settings.title')}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings2 className="h-6 w-6 text-muted-foreground" />
              {t('settings.title')}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t('settings.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SettingsSearch onNavigate={handleSearchNavigate} />
            {hasChanges && (
              <>
                <Button variant="ghost" size="sm" onClick={cancelChanges}>
                  {t('common.cancel')}
                </Button>
                <Button size="sm" onClick={saveChanges}>
                  {t('common.saveChanges')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 h-auto p-1 bg-muted/50">
          {Object.entries(TAB_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <TabsTrigger 
                key={key}
                value={key} 
                className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-background"
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium">{config.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ========== CONTENT TAB ========== */}
        <TabsContent value="content" className="space-y-6">
          <StaggerContainer className="space-y-6">
          {/* Tab Header */}
          <StaggerItem>
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/10">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookMarked className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">{t('settings.manageContent')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('settings.manageContentDesc')}
                </p>
              </div>
            </div>
          </StaggerItem>

          {/* Stats */}
          <StaggerItem>
            <motion.div 
              className="grid gap-4 md:grid-cols-3"
              variants={{
                animate: {
                  transition: { staggerChildren: 0.05 }
                }
              }}
            >
              <motion.div variants={staggerItemVariants}>
                <AnimatedStatsCard
                  icon={Layers}
                  iconClassName="bg-purple-500/10 text-purple-600"
                  label={t('settings.domains')}
                  value={3}
                />
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <AnimatedStatsCard
                  icon={Shield}
                  iconClassName="bg-blue-500/10 text-blue-600"
                  label={t('settings.frameworks')}
                  value={frameworks.length}
                />
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <AnimatedStatsCard
                  icon={BookOpen}
                  iconClassName="bg-green-500/10 text-green-600"
                  label={t('settings.questions')}
                  value={questions.length}
                />
              </motion.div>
            </motion.div>
          </StaggerItem>

          {/* Domain Management */}
          <StaggerItem>
            <AnimatedSectionCard
              ref={setSectionRef('domains')}
              id="domains"
              title={t('settings.securityDomains')}
              description={t('settings.createEditManage')}
              icon={Layers}
              isHighlighted={highlightedSection === 'domains'}
            >
              <DomainManagement />
            </AnimatedSectionCard>
          </StaggerItem>

          {/* Framework Management */}
          <StaggerItem>
            <AnimatedSectionCard
              ref={setSectionRef('frameworks-management')}
              id="frameworks-management"
              title={t('settings.frameworks')}
              description={t('settings.createEditDelete')}
              icon={Shield}
              isHighlighted={highlightedSection === 'frameworks-management'}
            >
              <FrameworkManagement />
            </AnimatedSectionCard>
          </StaggerItem>

          {/* Question Management */}
          <StaggerItem>
            <AnimatedSectionCard
              ref={setSectionRef('questions-management')}
              id="questions-management"
              title={t('settings.questions')}
              description={t('settings.createEditImport')}
              icon={BookOpen}
              isHighlighted={highlightedSection === 'questions-management'}
            >
              <QuestionManagement />
            </AnimatedSectionCard>
          </StaggerItem>
          </StaggerContainer>
        </TabsContent>

        {/* ========== ASSESSMENT TAB ========== */}
        <TabsContent value="assessment" className="space-y-6">
          <StaggerContainer className="space-y-6">
          {/* Tab Header */}
          <StaggerItem>
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-500/5 to-transparent rounded-lg border border-amber-500/10">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold">{t('settings.configureAssessment')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('settings.configureAssessmentDesc')}
                </p>
              </div>
            </div>
          </StaggerItem>

          {/* Current Assessment Summary */}
          <StaggerItem>
            <motion.div 
              className="grid gap-4 md:grid-cols-4"
              variants={{
                animate: {
                  transition: { staggerChildren: 0.04 }
                }
              }}
            >
              <motion.div variants={staggerItemVariants} className="md:col-span-2">
                <Card className="h-full bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('settings.activeFrameworks')}</p>
                        <p className="text-3xl font-bold text-primary">{pendingFrameworks.length}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{t('settings.ofAvailable', { count: frameworks.length })}</p>
                        <p className="text-sm font-medium text-primary mt-1">
                          {totalQuestions} {t('settings.questions').toLowerCase()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <Card className="h-full">
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-muted-foreground">{t('assessment.answered')}</p>
                    <p className="text-2xl font-bold">{totalAnswered}</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <Card className="h-full">
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-muted-foreground">{t('settings.lastUpdate')}</p>
                    <p className="text-sm font-medium">
                      {lastUpdated 
                        ? lastUpdated.toLocaleDateString()
                        : 'N/A'
                      }
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </StaggerItem>

          {/* Assessment Info */}
          <StaggerItem>
            <AnimatedSectionCard
              ref={setSectionRef('assessment-info')}
              id="assessment-info"
              title={t('settings.assessmentInfo')}
              icon={Building2}
              isHighlighted={highlightedSection === 'assessment-info'}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="assessmentName">{t('settings.assessmentName')}</Label>
                  <Input
                    id="assessmentName"
                    value={assessmentName}
                    onChange={(e) => setAssessmentName(e.target.value)}
                    placeholder={t('settings.assessmentNamePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizationName">{t('profile.organization')}</Label>
                  <Input
                    id="organizationName"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder={t('settings.organizationPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reassessmentInterval">{t('settings.reassessmentCadence')}</Label>
                  <Select value={reassessmentInterval} onValueChange={setReassessmentInterval}>
                    <SelectTrigger id="reassessmentInterval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">{t('settings.monthly')}</SelectItem>
                      <SelectItem value="quarterly">{t('settings.quarterly')}</SelectItem>
                      <SelectItem value="semiannual">{t('settings.semiannual')}</SelectItem>
                      <SelectItem value="annual">{t('settings.annual')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AnimatedSectionCard>
          </StaggerItem>

          {/* Framework Selection */}
          <StaggerItem>
            <div ref={setSectionRef('framework-selection')}>
              <Card className={cn(
                "transition-all duration-500",
                highlightedSection === 'framework-selection' && "ring-2 ring-primary ring-offset-2"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        {t('settings.selectFrameworksForAssessment')}
                      </CardTitle>
                      <CardDescription>
                        {t('settings.chooseFrameworksDesc')}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={selectAll}>{t('common.all')}</Button>
                      <Button variant="ghost" size="sm" onClick={selectDefaults}>{t('common.default')}</Button>
                      <Button variant="ghost" size="sm" onClick={selectNone}>{t('settings.clear')}</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <motion.div 
                    className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
                    variants={{
                      animate: {
                        transition: { staggerChildren: 0.03 }
                      }
                    }}
                  >
                    {frameworks.map(fw => (
                      <motion.div key={fw.frameworkId} variants={staggerItemVariants}>
                        <FrameworkCard fw={fw} />
                      </motion.div>
                    ))}
                  </motion.div>
                </CardContent>
              </Card>
            </div>
          </StaggerItem>

          {/* Info Card */}
          <StaggerItem>
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">{t('settings.howItWorks')}:</p>
                    <ul className="space-y-1">
                      <li>• {t('settings.howItWorksItem1')}</li>
                      <li>• {t('settings.howItWorksItem2')}</li>
                      <li>• {t('settings.howItWorksItem3')}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          </StaggerContainer>
        </TabsContent>

        {/* ========== PREFERENCES TAB ========== */}
        <TabsContent value="preferences" className="space-y-6">
          <StaggerContainer className="space-y-6">
          {/* Tab Header */}
          <StaggerItem>
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-pink-500/5 to-transparent rounded-lg border border-pink-500/10">
              <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Palette className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <h2 className="font-semibold">{t('settings.preferencesTab')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('settings.preferencesDesc')}
                </p>
              </div>
            </div>
          </StaggerItem>

          {preferencesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Appearance Settings */}
              <StaggerItem>
                <motion.div
                  ref={setSectionRef('appearance')}
                  initial={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.005, y: -2, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const } }}
                >
                  <Card className={cn(
                    "transition-all duration-300",
                    highlightedSection === 'appearance' && "ring-2 ring-primary ring-offset-2"
                  )}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        {t('profile.appearance')}
                      </CardTitle>
                      <CardDescription>
                        {t('profile.appearanceDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>{t('profile.theme')}</Label>
                            <p className="text-sm text-muted-foreground">
                              {t('profile.themeDescription')}
                            </p>
                          </div>
                          <ToggleGroup
                            type="single"
                            value={theme}
                            onValueChange={(value) => value && setTheme(value)}
                            className="bg-muted rounded-lg p-1"
                          >
                            <ToggleGroupItem
                              value="light"
                              aria-label="Modo claro"
                              className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
                            >
                              <Sun className="h-4 w-4" />
                            </ToggleGroupItem>
                            <ToggleGroupItem
                              value="dark"
                              aria-label="Modo escuro"
                              className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
                            >
                              <Moon className="h-4 w-4" />
                            </ToggleGroupItem>
                            <ToggleGroupItem
                              value="system"
                              aria-label="Seguir sistema"
                              className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
                            >
                              <Monitor className="h-4 w-4" />
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              {t('profile.language')}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {t('profile.languageDescription')}
                            </p>
                          </div>
                          <Select
                            value={language}
                            onValueChange={handleSaveLanguage}
                            disabled={savingLanguage}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Selecionar idioma" />
                            </SelectTrigger>
                            <SelectContent>
                              {LANGUAGES.map((lang) => (
                                <SelectItem key={lang.code} value={lang.code}>
                                  <span className="flex items-center gap-2">
                                    <span>{lang.flag}</span>
                                    <span>{lang.name}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </StaggerItem>

              {/* Voice Settings */}
              <StaggerItem>
                <motion.div
                  ref={setSectionRef('voice-settings')}
                  initial={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.005, y: -2, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const } }}
                >
                  <Card className={cn(
                    "transition-all duration-300",
                    highlightedSection === 'voice-settings' && "ring-2 ring-primary ring-offset-2"
                  )}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Volume2 className="h-4 w-4" />
                        {t('profile.voiceSettings')}
                      </CardTitle>
                      <CardDescription>
                        {t('profile.voiceSettingsDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Voice Language */}
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="flex items-center gap-2">
                              <Mic className="h-4 w-4" />
                              {t('profile.voiceLanguage')}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {t('profile.voiceLanguageDescription')}
                            </p>
                          </div>
                          <Select
                            value={voiceSettings.voice_language}
                            onValueChange={(v) => handleSaveVoiceSetting('voice_language', v)}
                            disabled={savingVoice}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Selecionar idioma" />
                            </SelectTrigger>
                            <SelectContent>
                              {LANGUAGES.map((lang) => (
                                <SelectItem key={lang.code} value={lang.code}>
                                  <span className="flex items-center gap-2">
                                    <span>{lang.flag}</span>
                                    <span>{lang.name}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Voice Selection */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>{t('profile.preferredVoice')}</Label>
                              <p className="text-sm text-muted-foreground">
                                {t('profile.preferredVoiceDescription')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select
                                value={voiceSettings.voice_name || 'auto'}
                                onValueChange={(v) => handleSaveVoiceSetting('voice_name', v === 'auto' ? null : v)}
                                disabled={savingVoice}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder={t('profile.selectVoice')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="auto">
                                    {t('profile.autoSelectVoice')}
                                  </SelectItem>
                                  {filteredVoices.length > 0 ? (
                                    filteredVoices.map((voice) => (
                                      <SelectItem key={voice.name} value={voice.name}>
                                        {voice.name} ({voice.lang})
                                      </SelectItem>
                                    ))
                                  ) : (
                                    voices.slice(0, 10).map((voice) => (
                                      <SelectItem key={voice.name} value={voice.name}>
                                        {voice.name} ({voice.lang})
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={testVoice}
                                className={isSpeaking ? 'text-primary' : ''}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Speech Rate */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>{t('profile.speechRate')}</Label>
                              <p className="text-sm text-muted-foreground">
                                {t('profile.speechRateDescription')}
                              </p>
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{voiceSettings.voice_rate.toFixed(1)}x</span>
                          </div>
                          <Slider
                            value={[voiceSettings.voice_rate]}
                            min={0.5}
                            max={2}
                            step={0.1}
                            onValueCommit={(value) => handleSaveVoiceSetting('voice_rate', value[0])}
                            onValueChange={(value) => setVoiceSettings(prev => ({ ...prev, voice_rate: value[0] }))}
                            disabled={savingVoice}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{t('profile.slower')}</span>
                            <span>{t('profile.normal')}</span>
                            <span>{t('profile.faster')}</span>
                          </div>
                        </div>

                        {/* Pitch */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>{t('profile.voicePitch')}</Label>
                              <p className="text-sm text-muted-foreground">
                                {t('profile.voicePitchDescription')}
                              </p>
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{voiceSettings.voice_pitch.toFixed(1)}</span>
                          </div>
                          <Slider
                            value={[voiceSettings.voice_pitch]}
                            min={0.5}
                            max={2}
                            step={0.1}
                            onValueCommit={(value) => handleSaveVoiceSetting('voice_pitch', value[0])}
                            onValueChange={(value) => setVoiceSettings(prev => ({ ...prev, voice_pitch: value[0] }))}
                            disabled={savingVoice}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{t('profile.lower')}</span>
                            <span>{t('profile.default')}</span>
                            <span>{t('profile.higher')}</span>
                          </div>
                        </div>

                        {/* Volume */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>{t('profile.voiceVolume')}</Label>
                              <p className="text-sm text-muted-foreground">
                                {t('profile.voiceVolumeDescription')}
                              </p>
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{Math.round(voiceSettings.voice_volume * 100)}%</span>
                          </div>
                          <Slider
                            value={[voiceSettings.voice_volume]}
                            min={0}
                            max={1}
                            step={0.1}
                            onValueCommit={(value) => handleSaveVoiceSetting('voice_volume', value[0])}
                            onValueChange={(value) => setVoiceSettings(prev => ({ ...prev, voice_volume: value[0] }))}
                            disabled={savingVoice}
                            className="w-full"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="space-y-0.5">
                            <Label htmlFor="voice_auto_speak" className="flex items-center gap-2">
                              <Volume2 className="h-4 w-4" />
                              {t('profile.autoSpeak')}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {t('profile.autoSpeakDescription')}
                            </p>
                          </div>
                          <Switch
                            id="voice_auto_speak"
                            checked={voiceSettings.voice_auto_speak}
                            onCheckedChange={(checked) => handleSaveVoiceSetting('voice_auto_speak', checked)}
                            disabled={savingVoice}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </StaggerItem>

              {/* STT Configuration */}
              <StaggerItem>
                <div ref={setSectionRef('stt-config')}>
                  <STTConfigurationCard
                    settings={sttSettings}
                    onSave={handleSaveSTTSetting}
                    isSaving={savingSTT}
                  />
                </div>
              </StaggerItem>

              {/* Voice Profile (Speaker Recognition) */}
              <StaggerItem>
                <div ref={setSectionRef('voice-profile')}>
                  <VoiceProfileCard language={voiceSettings.voice_language} />
                </div>
              </StaggerItem>

              {/* Notification Preferences */}
              <StaggerItem>
                <motion.div
                  ref={setSectionRef('notifications')}
                  initial={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.005, y: -2, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const } }}
                >
                  <Card className={cn(
                    "transition-all duration-300",
                    highlightedSection === 'notifications' && "ring-2 ring-primary ring-offset-2"
                  )}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        {t('profile.notificationPreferences')}
                      </CardTitle>
                      <CardDescription>
                        {t('profile.notificationDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="notify_assessment_updates">{t('profile.assessmentUpdates')}</Label>
                            <p className="text-sm text-muted-foreground">
                              {t('profile.assessmentUpdatesDescription')}
                            </p>
                          </div>
                          <Switch
                            id="notify_assessment_updates"
                            checked={notifications.notify_assessment_updates}
                            onCheckedChange={(checked) => handleSaveNotifications('notify_assessment_updates', checked)}
                            disabled={savingNotifications}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="notify_security_alerts">{t('profile.securityAlerts')}</Label>
                            <p className="text-sm text-muted-foreground">
                              {t('profile.securityAlertsDescription')}
                            </p>
                          </div>
                          <Switch
                            id="notify_security_alerts"
                            checked={notifications.notify_security_alerts}
                            onCheckedChange={(checked) => handleSaveNotifications('notify_security_alerts', checked)}
                            disabled={savingNotifications}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="notify_weekly_digest">{t('profile.weeklyDigest')}</Label>
                            <p className="text-sm text-muted-foreground">
                              {t('profile.weeklyDigestDescription')}
                            </p>
                          </div>
                          <Switch
                            id="notify_weekly_digest"
                            checked={notifications.notify_weekly_digest}
                            onCheckedChange={(checked) => handleSaveNotifications('notify_weekly_digest', checked)}
                            disabled={savingNotifications}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="notify_new_features">{t('profile.newFeatures')}</Label>
                            <p className="text-sm text-muted-foreground">
                              {t('profile.newFeaturesDescription')}
                            </p>
                          </div>
                          <Switch
                            id="notify_new_features"
                            checked={notifications.notify_new_features}
                            onCheckedChange={(checked) => handleSaveNotifications('notify_new_features', checked)}
                            disabled={savingNotifications}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </StaggerItem>
            </>
          )}
          </StaggerContainer>
        </TabsContent>

        {/* ========== SYSTEM TAB ========== */}
        <TabsContent value="system" className="space-y-6">
          <StaggerContainer className="space-y-6">
          {/* Tab Header */}
          <StaggerItem>
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-500/5 to-transparent rounded-lg border border-gray-500/10">
              <div className="h-10 w-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
                <Cog className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h2 className="font-semibold">{t('settings.systemTab')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('settings.exportAndGeneralDesc')}
                </p>
              </div>
            </div>
          </StaggerItem>

          {/* System Stats */}
          <StaggerItem>
            <motion.div 
              className="grid gap-4 md:grid-cols-4"
              variants={{
                animate: {
                  transition: { staggerChildren: 0.04 }
                }
              }}
            >
              <motion.div variants={staggerItemVariants}>
                <Card className="h-full">
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-sm text-muted-foreground">{t('settings.version')}</p>
                    <p className="text-xl font-bold">2.0.0</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <Card className="h-full">
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-sm text-muted-foreground">{t('settings.frameworks')}</p>
                    <p className="text-xl font-bold">{frameworks.length}</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <Card className="h-full">
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-sm text-muted-foreground">{t('settings.questions')}</p>
                    <p className="text-xl font-bold">{questions.length}</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <Card className="h-full">
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-sm text-muted-foreground">{t('settings.update')}</p>
                    <p className="text-xl font-bold">Jan/25</p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </StaggerItem>

          <StaggerItem>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Export */}
              <motion.div
                ref={setSectionRef('export')}
                initial={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.01, y: -3, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const } }}
              >
                <Card className={cn(
                  "transition-all duration-300 h-full",
                  highlightedSection === 'export' && "ring-2 ring-primary ring-offset-2"
                )}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileDown className="h-4 w-4" />
                      {t('settings.exportBackup')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {t('settings.exportDescription')}
                    </p>
                    <Button variant="outline" onClick={handleExportData} className="w-full justify-start">
                      <FileDown className="h-4 w-4 mr-2" />
                      {t('settings.exportToExcel')}
                    </Button>
                    <Separator />
                    <div ref={setSectionRef('demo-data')}>
                      <p className="text-sm text-muted-foreground mb-3">
                        {t('settings.generateDemoDescription')}
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {t('settings.generateDemoData')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('settings.generateDemoTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('settings.generateDemoDescription2')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={handleGenerateDemo}>
                              {t('settings.generateData')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Danger Zone */}
              <motion.div
                ref={setSectionRef('clear-answers')}
                initial={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.01, y: -3, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const } }}
              >
                <Card className={cn(
                  "transition-all duration-300 h-full",
                  (highlightedSection === 'clear-answers' || highlightedSection === 'restore-defaults') && "ring-2 ring-primary ring-offset-2"
                )}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      {t('settings.dangerZone')}
                    </CardTitle>
                    <CardDescription>
                      {t('settings.dangerZoneDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                      <div>
                        <div className="font-medium text-sm">{t('settings.clearAnswers')}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('settings.removesAllAnswers', { count: totalAnswered })}
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            {t('settings.clear')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('settings.clearAllAnswersTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('settings.clearAllAnswersDesc', { count: totalAnswered })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleClearAnswers}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {t('settings.clearAnswers')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    <div ref={setSectionRef('restore-defaults')} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                      <div>
                        <div className="font-medium text-sm">{t('settings.restoreDefaults')}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('settings.resetsSettingsAndData')}
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            {t('settings.restore')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('settings.restoreDefaultsTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('settings.restoreDefaultsDesc')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={async () => {
                                await clearAnswers();
                                await setEnabledFrameworks(
                                  frameworks.filter(f => f.defaultEnabled).map(f => f.frameworkId)
                                );
                                setPendingFrameworks(
                                  frameworks.filter(f => f.defaultEnabled).map(f => f.frameworkId)
                                );
                                toast.success(t('settings.settingsRestored'));
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {t('settings.restoreDefaults')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </StaggerItem>

          {/* About */}
          <StaggerItem>
            <motion.div
              ref={setSectionRef('about')}
              initial={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.005, y: -2, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const } }}
            >
              <Card className={cn(
                "transition-all duration-300",
                highlightedSection === 'about' && "ring-2 ring-primary ring-offset-2"
              )}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    {t('settings.aboutPlatform')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">{t('settings.supportedFrameworks')}</h4>
                    <div className="flex flex-wrap gap-2">
                      {frameworks.map(fw => (
                        <Badge key={fw.frameworkId} variant="outline" className="text-xs">
                          {fw.shortName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2">{t('settings.assessmentMethodology')}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">1</span>
                        <span>{t('settings.methodologyItem1')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">2</span>
                        <span>{t('settings.methodologyItem2')}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">3</span>
                        <span>{t('settings.methodologyItem3')}</span>
                      </li>
                    </ul>
                  </div>
                  
                  <Separator />
                  
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 pb-4">
                      <h4 className="font-medium mb-2 text-sm">{t('settings.privacyStorage')}</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• {t('settings.privacyItem1')}</li>
                        <li>• {t('settings.privacyItem2')}</li>
                        <li>• {t('settings.privacyItem3')}</li>
                      </ul>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </motion.div>
          </StaggerItem>
          </StaggerContainer>
        </TabsContent>

        {/* ========== AUDIT LOGS TAB ========== */}
        <TabsContent value="audit" className="space-y-6">
          <StaggerContainer className="space-y-6">
            {/* Tab Header */}
            <StaggerItem>
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/10">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">{t('auditLogs.title')}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t('auditLogs.description')}
                  </p>
                </div>
              </div>
            </StaggerItem>

            <StaggerItem>
              <AuditLogsPanel />
            </StaggerItem>
          </StaggerContainer>
        </TabsContent>

        {/* ========== SIEM INTEGRATIONS TAB ========== */}
        <TabsContent value="siem" className="space-y-6">
          <StaggerContainer className="space-y-6">
            {/* Tab Header */}
            <StaggerItem>
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/10">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">{t('siem.title')}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t('siem.description')}
                  </p>
                </div>
              </div>
            </StaggerItem>

            <StaggerItem>
              <SIEMIntegrationsPanel />
            </StaggerItem>

            {/* Health Monitoring */}
            <StaggerItem>
              <SIEMHealthPanel />
            </StaggerItem>
          </StaggerContainer>
        </TabsContent>

        {/* ========== AI PROVIDERS TAB ========== */}
        <TabsContent value="ai" className="space-y-6">
          <StaggerContainer className="space-y-6">
            {/* Tab Header */}
            <StaggerItem>
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/10">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">{t('aiProviders.title', 'Provedores de IA')}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t('aiProviders.description', 'Configure diferentes provedores de IA para o assistente')}
                  </p>
                </div>
              </div>
            </StaggerItem>

            <StaggerItem>
              <AIProvidersPanel />
            </StaggerItem>
          </StaggerContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
}
