import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useLoginRateLimit } from '@/hooks/useLoginRateLimit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, LogIn, AlertTriangle, Clock, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// Demo credentials for testing/showcase purposes
const DEMO_EMAIL = 'demo@aiassess.app';
const DEMO_PASSWORD = 'Demo@2025!';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    isLocked, 
    recordAttempt, 
    getAttemptsRemaining, 
    remainingTime, 
    formatRemainingTime,
    attempts 
  } = useLoginRateLimit();
  
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
  const attemptsRemaining = getAttemptsRemaining();
  const maxAttempts = 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if locked out
    if (isLocked()) {
      setError(t('auth.rateLimitLocked', { time: formatRemainingTime() }));
      return;
    }
    
    setError(null);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        recordAttempt(false);
        
        if (isLocked()) {
          setError(t('auth.rateLimitLocked', { time: formatRemainingTime() }));
        } else if (error.message.includes('Invalid login credentials')) {
          setError(t('auth.invalidCredentials'));
        } else {
          setError(error.message);
        }
      } else {
        recordAttempt(true);
        navigate(from, { replace: true });
      }
    } catch (err) {
      recordAttempt(false);
      setError(t('errors.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const locked = isLocked();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-3 sm:p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 rounded-full bg-primary/10">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold">{t('auth.loginTitle')}</CardTitle>
          <CardDescription className="text-sm">
            {t('auth.accessAccount')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
            {/* Demo credentials info banner */}
            <Alert className="border-primary/30 bg-primary/5">
              <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
              <AlertDescription className="ml-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs sm:text-sm font-medium text-primary">Conta Demo para Testes</span>
                  <div className="flex flex-col xs:flex-row flex-wrap gap-1 sm:gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs w-fit">
                      {DEMO_EMAIL}
                    </Badge>
                    <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs w-fit">
                      {DEMO_PASSWORD}
                    </Badge>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
            
            {locked && (
              <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                <Clock className="h-4 w-4" />
                <AlertDescription className="ml-2">
                  {t('auth.rateLimitLocked', { time: formatRemainingTime() })}
                </AlertDescription>
              </Alert>
            )}
            
            {!locked && error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {!locked && attempts > 0 && attemptsRemaining > 0 && attemptsRemaining <= 3 && (
              <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="ml-2 text-amber-700 dark:text-amber-400">
                  {t('auth.attemptsRemaining', { count: attemptsRemaining })}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || locked}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary hover:underline"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || locked}
                minLength={6}
              />
            </div>
            
            {locked && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('auth.lockoutProgress')}</span>
                  <span>{formatRemainingTime()}</span>
                </div>
                <Progress value={100 - (remainingTime / 30) * 100} className="h-2" />
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading || locked}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.loggingIn')}
                </>
              ) : locked ? (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  {t('auth.temporarilyLocked')}
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  {t('auth.loginButton')}
                </>
              )}
            </Button>
            
            <p className="text-sm text-muted-foreground text-center">
              {t('auth.noAccount')}{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                {t('auth.createAccount')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
