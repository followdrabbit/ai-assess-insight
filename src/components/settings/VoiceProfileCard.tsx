/**
 * VoiceProfileCard Component
 * UI for voice profile enrollment, management, and verification settings
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Fingerprint, 
  Mic, 
  MicOff, 
  Check, 
  X, 
  RefreshCw, 
  Trash2, 
  Volume2,
  Shield,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  SkipForward,
} from 'lucide-react';
import { useVoiceProfile } from '@/hooks/useVoiceProfile';
import { ENROLLMENT_CONFIGS, EnrollmentLevel } from '@/lib/voiceProfile/types';
import { cn } from '@/lib/utils';

interface VoiceProfileCardProps {
  language?: string;
}

export function VoiceProfileCard({ language = 'pt-BR' }: VoiceProfileCardProps) {
  const { t } = useTranslation();
  const {
    profile,
    isLoading,
    isEnrolling,
    isRecording,
    isProcessing,
    recordingDuration,
    audioLevels,
    currentPhraseIndex,
    enrollmentProgress,
    enrolledSamples,
    error,
    startEnrollment,
    recordPhrase,
    stopRecording,
    skipPhrase,
    retryPhrase,
    completeEnrollment,
    cancelEnrollment,
    deleteProfile,
    toggleProfileEnabled,
    updateNoiseThreshold,
    getCurrentPhrase,
    getPhrasesForLevel,
  } = useVoiceProfile();

  const [showEnrollmentDialog, setShowEnrollmentDialog] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<EnrollmentLevel>('standard');
  const [isCompleting, setIsCompleting] = useState(false);
  const [lastSampleQuality, setLastSampleQuality] = useState<number | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Animate progress bar during processing
  useEffect(() => {
    if (isProcessing) {
      setProcessingProgress(0);
      const startTime = Date.now();
      const duration = 2000; // 2 seconds to reach 90%
      
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(90, (elapsed / duration) * 90);
        setProcessingProgress(progress);
      }, 50);
      
      return () => clearInterval(interval);
    } else {
      // Complete the progress bar when done
      if (processingProgress > 0) {
        setProcessingProgress(100);
        setTimeout(() => setProcessingProgress(0), 300);
      }
    }
  }, [isProcessing]);

  const handleStartEnrollment = () => {
    startEnrollment(selectedLevel, language);
    setShowEnrollmentDialog(false);
  };

  const handleRecordPhrase = async () => {
    const sample = await recordPhrase();
    if (sample) {
      setLastSampleQuality(sample.qualityScore);
    }
  };

  const handleNextPhrase = () => {
    const totalPhrases = ENROLLMENT_CONFIGS[selectedLevel].phrasesCount;
    if (currentPhraseIndex < totalPhrases - 1) {
      // Move to next phrase automatically after successful recording
    }
  };

  const handleCompleteEnrollment = async () => {
    setIsCompleting(true);
    await completeEnrollment();
    setIsCompleting(false);
  };

  const totalPhrases = ENROLLMENT_CONFIGS[selectedLevel]?.phrasesCount || 6;
  const hasRecordedCurrentPhrase = enrolledSamples.some(s => s.phraseIndex === currentPhraseIndex);
  const canComplete = enrolledSamples.length >= Math.floor(totalPhrases * 0.7); // At least 70% completion

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Perfil de Voz
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Enrollment Flow
  if (isEnrolling) {
    const phrases = getPhrasesForLevel(selectedLevel, language);
    const currentPhrase = phrases[currentPhraseIndex] || '';
    const progressPercent = ((currentPhraseIndex + (hasRecordedCurrentPhrase ? 1 : 0)) / totalPhrases) * 100;

    return (
      <Card className="border-primary/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-primary" />
              Cadastro de Voz
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={cancelEnrollment}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            {ENROLLMENT_CONFIGS[selectedLevel].description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Frase {currentPhraseIndex + 1} de {totalPhrases}</span>
              <span className="text-muted-foreground">{Math.round(progressPercent)}% completo</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Current Phrase */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground mb-2">Leia a frase abaixo em voz clara:</p>
            <p className="text-lg font-medium leading-relaxed">"{currentPhrase}"</p>
          </div>

          {/* Recording Status */}
          {isRecording && (
            <div className="flex flex-col items-center gap-4">
              {/* Real-time Sound Wave Visualization */}
              <div className="flex items-end justify-center gap-1 h-16 px-4">
                {audioLevels.map((level, i) => (
                  <div
                    key={i}
                    className="w-2 bg-destructive rounded-full transition-all duration-75"
                    style={{
                      height: `${Math.max(8, level * 100)}%`,
                      opacity: Math.max(0.4, level),
                    }}
                  />
                ))}
              </div>
              
              <div className="flex items-center gap-2 text-destructive">
                <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                <span className="text-lg font-medium">Gravando... {recordingDuration}s</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Para automaticamente em {15 - recordingDuration}s
              </p>
            </div>
          )}

          {/* Processing Status */}
          {isProcessing && (
            <div className="flex flex-col items-center gap-4 py-4 w-full">
              <div className="flex items-center gap-3 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-lg font-medium">Processando áudio...</span>
              </div>
              <div className="w-full max-w-xs space-y-2">
                <Progress value={processingProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Analisando características vocais... {Math.round(processingProgress)}%
                </p>
              </div>
            </div>
          )}

          {/* Quality Feedback */}
          {lastSampleQuality !== null && !isRecording && !isProcessing && (
            <div className={cn(
              "flex items-center gap-2 rounded-lg p-3",
              lastSampleQuality >= 0.7 ? "bg-green-500/10 text-green-600" : 
              lastSampleQuality >= 0.4 ? "bg-yellow-500/10 text-yellow-600" : 
              "bg-red-500/10 text-red-600"
            )}>
              {lastSampleQuality >= 0.7 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm">
                {lastSampleQuality >= 0.7 ? 'Ótima qualidade!' : 
                 lastSampleQuality >= 0.4 ? 'Qualidade aceitável' : 
                 'Qualidade baixa - tente novamente'}
              </span>
            </div>
          )}

          {/* Recording Controls */}
          <div className="flex items-center justify-center gap-3">
            {!isRecording && !hasRecordedCurrentPhrase && (
              <Button onClick={handleRecordPhrase} size="lg" className="gap-2">
                <Mic className="h-5 w-5" />
                Gravar Frase
              </Button>
            )}

            {isRecording && (
              <Button 
                onClick={stopRecording} 
                variant="destructive" 
                size="lg" 
                className="gap-2 min-h-[56px] min-w-[200px] text-lg font-semibold shadow-lg active:scale-95 transition-transform touch-manipulation"
              >
                <MicOff className="h-6 w-6" />
                Parar Gravação
              </Button>
            )}

            {hasRecordedCurrentPhrase && !isRecording && !isProcessing && (
              <>
                <Button onClick={retryPhrase} variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Regravar
                </Button>
                
                {currentPhraseIndex < totalPhrases - 1 ? (
                  <Button 
                    onClick={() => {
                      setLastSampleQuality(null);
                      skipPhrase();
                    }} 
                    size="lg" 
                    className="gap-2"
                  >
                    Próxima Frase
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : null}
              </>
            )}
          </div>

          {/* Skip Option */}
          {!hasRecordedCurrentPhrase && !isRecording && !isProcessing && currentPhraseIndex < totalPhrases - 1 && (
            <div className="flex justify-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={skipPhrase}
                className="text-muted-foreground"
              >
                <SkipForward className="h-4 w-4 mr-1" />
                Pular esta frase
              </Button>
            </div>
          )}

          {/* Complete Enrollment */}
          {canComplete && (
            <div className="pt-4 border-t">
              <Button 
                onClick={handleCompleteEnrollment} 
                className="w-full gap-2"
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Finalizar Cadastro ({enrolledSamples.length} frases gravadas)
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Profile Exists
  if (profile) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Perfil de Voz
            </CardTitle>
            <div className="flex items-center gap-2">
              <Switch 
                checked={profile.isEnabled} 
                onCheckedChange={toggleProfileEnabled}
              />
              <Label className="text-sm">
                {profile.isEnabled ? 'Ativo' : 'Inativo'}
              </Label>
            </div>
          </div>
          <CardDescription>
            Reconhecimento de voz personalizado para comandos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Status */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="font-medium">Perfil Cadastrado</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {profile.enrollmentPhrasesCount} frases gravadas • Nível {profile.enrollmentLevel === 'advanced' ? 'Avançado' : 'Padrão'}
              </p>
              {profile.enrolledAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Cadastrado em {new Date(profile.enrolledAt).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
            <Badge variant={profile.isEnabled ? 'default' : 'secondary'}>
              {profile.isEnabled ? 'Verificando' : 'Desativado'}
            </Badge>
          </div>

          {/* Noise Threshold Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Sensibilidade de Reconhecimento
              </Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(profile.noiseThreshold * 100)}%
              </span>
            </div>
            <Slider
              value={[profile.noiseThreshold]}
              onValueChange={([value]) => updateNoiseThreshold(value)}
              min={0.4}
              max={0.9}
              step={0.05}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Valores mais altos = mais rigoroso (menos falsos positivos, pode rejeitar sua voz em ambientes ruidosos)
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowEnrollmentDialog(true)}
              className="gap-2 flex-1"
            >
              <RefreshCw className="h-4 w-4" />
              Recadastrar Voz
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir Perfil de Voz?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é irreversível. Você precisará fazer um novo cadastro de voz para usar o reconhecimento personalizado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteProfile} className="bg-destructive text-destructive-foreground">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // No Profile - Show Enrollment Options
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Perfil de Voz
          </CardTitle>
          <CardDescription>
            Cadastre sua voz para que o sistema responda apenas aos seus comandos, filtrando ruídos e outras vozes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Standard Enrollment */}
            <button
              onClick={() => {
                setSelectedLevel('standard');
                setShowEnrollmentDialog(true);
              }}
              className="rounded-lg border p-4 text-left transition-all hover:border-primary hover:bg-primary/5"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Padrão</span>
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  1-2 min
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {ENROLLMENT_CONFIGS.standard.phrasesCount} frases de treinamento
              </p>
              <ul className="space-y-1">
                {ENROLLMENT_CONFIGS.standard.benefits.slice(0, 3).map((benefit, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                    <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </button>

            {/* Advanced Enrollment */}
            <button
              onClick={() => {
                setSelectedLevel('advanced');
                setShowEnrollmentDialog(true);
              }}
              className="rounded-lg border border-primary/50 p-4 text-left transition-all hover:border-primary hover:bg-primary/5 relative"
            >
              <Badge className="absolute -top-2 -right-2" variant="default">
                Recomendado
              </Badge>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Avançado</span>
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  3-5 min
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {ENROLLMENT_CONFIGS.advanced.phrasesCount} frases de treinamento
              </p>
              <ul className="space-y-1">
                {ENROLLMENT_CONFIGS.advanced.benefits.slice(0, 4).map((benefit, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                    <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Enrollment Confirmation Dialog */}
      <Dialog open={showEnrollmentDialog} onOpenChange={setShowEnrollmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar Cadastro de Voz</DialogTitle>
            <DialogDescription>
              Você selecionou o nível <strong>{selectedLevel === 'advanced' ? 'Avançado' : 'Padrão'}</strong>. 
              Prepare-se para ler {ENROLLMENT_CONFIGS[selectedLevel].phrasesCount} frases em um ambiente silencioso.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">Dicas para melhor resultado:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  Escolha um ambiente silencioso
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  Fale em tom de voz natural
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  Mantenha distância consistente do microfone
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  Leia cada frase completamente
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnrollmentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleStartEnrollment} className="gap-2">
              <Mic className="h-4 w-4" />
              Começar Cadastro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
