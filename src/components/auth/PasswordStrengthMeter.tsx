import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

interface PasswordRequirement {
  key: string;
  label: string;
  test: (password: string) => boolean;
}

export function usePasswordStrength(password: string) {
  return useMemo(() => {
    const requirements: PasswordRequirement[] = [
      {
        key: 'minLength',
        label: 'passwordReqLength',
        test: (p) => p.length >= 8,
      },
      {
        key: 'lowercase',
        label: 'passwordReqLowercase',
        test: (p) => /[a-z]/.test(p),
      },
      {
        key: 'uppercase',
        label: 'passwordReqUppercase',
        test: (p) => /[A-Z]/.test(p),
      },
      {
        key: 'number',
        label: 'passwordReqNumber',
        test: (p) => /[0-9]/.test(p),
      },
      {
        key: 'special',
        label: 'passwordReqSpecial',
        test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p),
      },
    ];

    const results = requirements.map((req) => ({
      ...req,
      met: req.test(password),
    }));

    const metCount = results.filter((r) => r.met).length;
    const strength = password.length === 0 ? 0 : (metCount / requirements.length) * 100;

    let level: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
    if (metCount >= 5) level = 'strong';
    else if (metCount >= 4) level = 'good';
    else if (metCount >= 3) level = 'fair';

    const isValid = metCount >= 4; // At least 4 requirements met

    return {
      requirements: results,
      strength,
      level,
      isValid,
      metCount,
    };
  }, [password]);
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const { t } = useTranslation();
  const { requirements, strength, level } = usePasswordStrength(password);

  if (password.length === 0) {
    return null;
  }

  const strengthColors = {
    weak: 'bg-destructive',
    fair: 'bg-amber-500',
    good: 'bg-blue-500',
    strong: 'bg-green-500',
  };

  const strengthLabels = {
    weak: t('auth.passwordWeak'),
    fair: t('auth.passwordFair'),
    good: t('auth.passwordGood'),
    strong: t('auth.passwordStrong'),
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{t('auth.passwordStrength')}</span>
          <span
            className={cn(
              'text-xs font-medium',
              level === 'weak' && 'text-destructive',
              level === 'fair' && 'text-amber-500',
              level === 'good' && 'text-blue-500',
              level === 'strong' && 'text-green-500'
            )}
          >
            {strengthLabels[level]}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300', strengthColors[level])}
            style={{ width: `${strength}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-1 gap-1">
        {requirements.map((req) => (
          <div
            key={req.key}
            className={cn(
              'flex items-center gap-2 text-xs transition-colors duration-200',
              req.met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
            )}
          >
            {req.met ? (
              <Check className="h-3 w-3 flex-shrink-0" />
            ) : (
              <X className="h-3 w-3 flex-shrink-0" />
            )}
            <span>{t(`auth.${req.label}`)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
