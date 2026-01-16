import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSyncedSpeechSynthesis } from '@/hooks/useSyncedSpeechSynthesis';
import { useVoiceSettings } from '@/contexts/VoiceSettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Loader2, User, Building, Mail, Shield, Save, CheckCircle, KeyRound, Bell, Moon, Sun, Monitor, Globe, Volume2, Mic, Play } from 'lucide-react';
import { toast } from 'sonner';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LANGUAGES = [
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'es-ES', name: 'Español (España)', flag: '🇪🇸' },
] as const;

interface Profile {
  display_name: string | null;
  organization: string | null;
  role: string | null;
  email: string | null;
}

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

export default function Profile() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { voices, speak, stop, isSpeaking } = useSyncedSpeechSynthesis();
  const { updateSettings: updateVoiceSettingsContext } = useVoiceSettings();
  
  const [profile, setProfile] = useState<Profile>({
    display_name: '',
    organization: '',
    role: '',
    email: '',
  });
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
  const [language, setLanguage] = useState('pt-BR');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, organization, role, email, notify_assessment_updates, notify_security_alerts, notify_weekly_digest, notify_new_features, language, voice_language, voice_rate, voice_pitch, voice_volume, voice_name, voice_auto_speak')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create one
          await createProfile();
        } else {
          throw error;
        }
      } else {
        setProfile({
          display_name: data.display_name || '',
          organization: data.organization || '',
          role: data.role || '',
          email: data.email || user.email || '',
        });
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
        const userLang = (data as any).language || 'pt-BR';
        setLanguage(userLang);
        i18n.changeLanguage(userLang);
      }
    } catch (err: any) {
      setError(err.message || t('errors.loadProfile'));
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    if (!user) return;
    
    const newProfile = {
      user_id: user.id,
      email: user.email,
      display_name: user.email?.split('@')[0] || '',
      organization: '',
      role: 'user',
    };
    
    const { error } = await supabase
      .from('profiles')
      .insert(newProfile);
    
    if (error) throw error;
    
    setProfile({
      display_name: newProfile.display_name,
      organization: '',
      role: 'user',
      email: user.email || '',
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profile.display_name,
          organization: profile.organization,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      toast.success('Perfil atualizado com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

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
      
      toast.success('Preferência atualizada!');
    } catch (err: any) {
      // Revert on error
      setNotifications(notifications);
      toast.error(err.message || 'Erro ao salvar preferência');
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleSaveLanguage = async (newLanguage: string) => {
    if (!user) return;
    
    const previousLanguage = language;
    setLanguage(newLanguage);
    setSavingLanguage(true);

    try {
      // Update i18next language
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
      // Revert on error
      setLanguage(previousLanguage);
      i18n.changeLanguage(previousLanguage);
      toast.error(err.message || t('errors.saveLanguage'));
    } finally {
      setSavingLanguage(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar senha');
    } finally {
      setChangingPassword(false);
    }
  };

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
      
      // Sync with context so other components get the update
      updateVoiceSettingsContext({ [key]: value });
      
      toast.success(t('profile.voiceSettingsSaved', 'Voice setting saved!'));
    } catch (err: any) {
      // Revert on error
      setVoiceSettings(prev => ({ ...prev, [key]: previousValue }));
      toast.error(err.message || t('errors.saveVoiceSettings', 'Error saving voice setting'));
    } finally {
      setSavingVoice(false);
    }
  };

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

  // Filter voices by selected language
  const filteredVoices = voices.filter(v => v.lang.startsWith(voiceSettings.voice_language.split('-')[0]));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb 
        items={[
          { label: 'Perfil', href: '/profile' }
        ]} 
      />

      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-primary/10">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais e configurações de conta</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>
              Atualize seu nome de exibição e organização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="display_name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome de Exibição
                </Label>
                <Input
                  id="display_name"
                  type="text"
                  placeholder="Seu nome"
                  value={profile.display_name || ''}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  disabled={saving}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="organization" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Organização
                </Label>
                <Input
                  id="organization"
                  type="text"
                  placeholder="Nome da sua empresa"
                  value={profile.organization || ''}
                  onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Função
                </Label>
                <Input
                  id="role"
                  type="text"
                  value={profile.role || 'user'}
                  disabled
                  className="bg-muted capitalize"
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Atualize sua senha de acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={changingPassword}
                  minLength={6}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={changingPassword}
                  minLength={6}
                  required
                />
              </div>
              
              <Button type="submit" variant="outline" className="w-full" disabled={changingPassword}>
                {changingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Alterar Senha
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Aparência
          </CardTitle>
          <CardDescription>
            Personalize a aparência da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Tema</Label>
                <p className="text-sm text-muted-foreground">
                  Escolha entre modo claro, escuro ou automático
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
                  Idioma
                </Label>
                <p className="text-sm text-muted-foreground">
                  Selecione o idioma da interface
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

      {/* Voice Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            {t('profile.voiceSettings', 'Voice Settings')}
          </CardTitle>
          <CardDescription>
            {t('profile.voiceSettingsDescription', 'Configure speech recognition and text-to-speech preferences')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Voice Language */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  {t('profile.voiceLanguage', 'Voice Language')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('profile.voiceLanguageDescription', 'Language for speech recognition and synthesis')}
                </p>
              </div>
              <Select 
                value={voiceSettings.voice_language} 
                onValueChange={(v) => handleSaveVoiceSetting('voice_language', v)}
                disabled={savingVoice}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select language" />
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
                  <Label>{t('profile.preferredVoice', 'Preferred Voice')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.preferredVoiceDescription', 'Select a voice for text-to-speech')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                <Select 
                  value={voiceSettings.voice_name || 'auto'} 
                  onValueChange={(v) => handleSaveVoiceSetting('voice_name', v === 'auto' ? null : v)}
                  disabled={savingVoice}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={t('profile.selectVoice', 'Select voice')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">
                      {t('profile.autoSelectVoice', 'Auto (System Default)')}
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
                  <Label>{t('profile.speechRate', 'Speech Rate')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.speechRateDescription', 'How fast the voice speaks')}
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
                <span>{t('profile.slower', 'Slower')}</span>
                <span>{t('profile.normal', 'Normal')}</span>
                <span>{t('profile.faster', 'Faster')}</span>
              </div>
            </div>

            {/* Pitch */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('profile.voicePitch', 'Voice Pitch')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.voicePitchDescription', 'How high or low the voice sounds')}
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
                <span>{t('profile.lower', 'Lower')}</span>
                <span>{t('profile.default', 'Default')}</span>
                <span>{t('profile.higher', 'Higher')}</span>
              </div>
            </div>

            {/* Volume */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('profile.voiceVolume', 'Voice Volume')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.voiceVolumeDescription', 'Volume level for text-to-speech')}
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

            {/* Auto-speak */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="voice_auto_speak" className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  {t('profile.autoSpeak', 'Auto-speak AI Responses')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('profile.autoSpeakDescription', 'Automatically read AI assistant responses aloud')}
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

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Preferências de Notificação
          </CardTitle>
          <CardDescription>
            Gerencie como e quando você recebe notificações por email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify_assessment_updates">Atualizações de Avaliação</Label>
                <p className="text-sm text-muted-foreground">
                  Receba notificações quando suas avaliações forem atualizadas
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
                <Label htmlFor="notify_security_alerts">Alertas de Segurança</Label>
                <p className="text-sm text-muted-foreground">
                  Receba alertas importantes sobre segurança e compliance
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
                <Label htmlFor="notify_weekly_digest">Resumo Semanal</Label>
                <p className="text-sm text-muted-foreground">
                  Receba um resumo semanal do seu progresso e métricas
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
                <Label htmlFor="notify_new_features">Novidades e Recursos</Label>
                <p className="text-sm text-muted-foreground">
                  Fique por dentro de novos recursos e melhorias da plataforma
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

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Status da Conta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">ID do Usuário</p>
              <p className="font-mono text-sm">{user?.id?.slice(0, 8)}...</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Email Verificado</p>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Sim</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Último Acesso</p>
              <p className="text-sm">
                {user?.last_sign_in_at 
                  ? new Date(user.last_sign_in_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
