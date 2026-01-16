import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Loader2, User, Building, Mail, Shield, Save, CheckCircle, KeyRound, Bell, Moon, Sun, Monitor, Globe } from 'lucide-react';
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

export default function Profile() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
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
  const [language, setLanguage] = useState('pt-BR');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
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
        .select('display_name, organization, role, email, notify_assessment_updates, notify_security_alerts, notify_weekly_digest, notify_new_features, language')
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
        setLanguage((data as any).language || 'pt-BR');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar perfil');
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
      const { error } = await supabase
        .from('profiles')
        .update({
          language: newLanguage,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const langName = LANGUAGES.find(l => l.code === newLanguage)?.name || newLanguage;
      toast.success(`Idioma alterado para ${langName}`);
    } catch (err: any) {
      // Revert on error
      setLanguage(previousLanguage);
      toast.error(err.message || 'Erro ao salvar idioma');
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
