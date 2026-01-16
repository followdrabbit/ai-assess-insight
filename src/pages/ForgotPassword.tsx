import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(t('errors.resetError'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">{t('auth.resetLinkSent')}</CardTitle>
            <CardDescription>
              {t('auth.checkInbox')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p>
              {t('forgotPassword.emailSentTo', { email })}
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link to="/login">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('forgotPassword.backToLogin')}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t('forgotPassword.title')}</CardTitle>
          <CardDescription>
            {t('forgotPassword.description')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('forgotPassword.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('forgotPassword.sending')}
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  {t('auth.sendResetLink')}
                </>
              )}
            </Button>
            
            <Link to="/login" className="w-full">
              <Button variant="outline" className="w-full" type="button">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('forgotPassword.backToLogin')}
              </Button>
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
