import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, Building, Mail, Save, KeyRound, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';

interface Profile {
  display_name: string | null;
  organization: string | null;
  role: string | null;
  email: string | null;
}

export default function Profile() {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [profile, setProfile] = useState<Profile>({
    display_name: '',
    organization: '',
    role: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        .select('display_name, organization, role, email')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
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
      
      toast.success(t('profile.profileUpdated', 'Perfil atualizado com sucesso!'));
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(t('profile.passwordsMismatch', 'As senhas não coincidem'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('profile.passwordTooShort', 'A nova senha deve ter pelo menos 6 caracteres'));
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      toast.success(t('profile.passwordChanged', 'Senha alterada com sucesso!'));
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
          { label: t('profile.title', 'Perfil'), href: '/profile' }
        ]} 
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('profile.myProfile', 'Meu Perfil')}</h1>
            <p className="text-muted-foreground">{t('profile.managePersonalInfo', 'Gerencie suas informações pessoais')}</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to="/settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t('profile.goToSettings', 'Ir para Configurações')}
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('profile.personalInfo', 'Informações Pessoais')}
            </CardTitle>
            <CardDescription>
              {t('profile.updateNameOrg', 'Atualize seu nome de exibição e organização')}
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
                  {t('profile.emailCannotChange', 'O email não pode ser alterado')}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="display_name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t('profile.displayName', 'Nome de Exibição')}
                </Label>
                <Input
                  id="display_name"
                  type="text"
                  placeholder={t('profile.yourName', 'Seu nome')}
                  value={profile.display_name || ''}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  disabled={saving}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="organization" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  {t('profile.organization', 'Organização')}
                </Label>
                <Input
                  id="organization"
                  type="text"
                  placeholder={t('profile.companyName', 'Nome da sua empresa')}
                  value={profile.organization || ''}
                  onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
                  disabled={saving}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.saving', 'Salvando...')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('common.saveChanges', 'Salvar Alterações')}
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
              {t('profile.changePassword', 'Alterar Senha')}
            </CardTitle>
            <CardDescription>
              {t('profile.updateAccessPassword', 'Atualize sua senha de acesso')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('profile.newPassword', 'Nova Senha')}</Label>
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
                <Label htmlFor="confirmPassword">{t('profile.confirmNewPassword', 'Confirmar Nova Senha')}</Label>
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
                    {t('profile.changing', 'Alterando...')}
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    {t('profile.changePassword', 'Alterar Senha')}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Info card pointing to Settings */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">{t('profile.lookingForSettings', 'Procurando configurações?')}</p>
              <p>
                {t('profile.settingsInfo', 'Configurações de aparência, idioma, voz e notificações foram movidas para a página de')}{' '}
                <Link to="/settings" className="text-primary hover:underline font-medium">
                  {t('settings.title', 'Configurações')}
                </Link>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
