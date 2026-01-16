import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Key, Globe, Server, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { STT_PROVIDERS, STTProviderType, getSTTProvider } from '@/lib/sttProviders';
import { cn } from '@/lib/utils';

interface STTSettings {
  stt_provider: STTProviderType;
  stt_api_key: string | null;
  stt_model: string;
  stt_endpoint_url: string | null;
}

interface STTConfigurationCardProps {
  settings: STTSettings;
  onSave: (key: keyof STTSettings, value: string | null) => Promise<void>;
  isSaving: boolean;
  disabled?: boolean;
}

export function STTConfigurationCard({ settings, onSave, isSaving, disabled }: STTConfigurationCardProps) {
  const { t } = useTranslation();
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(settings.stt_api_key || '');
  const [endpointInput, setEndpointInput] = useState(settings.stt_endpoint_url || '');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  
  const currentProvider = getSTTProvider(settings.stt_provider);

  const handleProviderChange = async (value: STTProviderType) => {
    await onSave('stt_provider', value);
    // Reset API key display when changing provider
    setApiKeyInput('');
    setTestStatus('idle');
  };

  const handleSaveApiKey = async () => {
    await onSave('stt_api_key', apiKeyInput || null);
  };

  const handleSaveEndpoint = async () => {
    await onSave('stt_endpoint_url', endpointInput || null);
  };

  const handleTestConnection = async () => {
    if (!currentProvider?.requiresApiKey || !apiKeyInput) return;
    
    setTestStatus('testing');
    
    try {
      if (settings.stt_provider === 'openai-whisper') {
        // Test OpenAI API connection
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKeyInput}`,
          },
        });
        
        if (response.ok) {
          setTestStatus('success');
        } else {
          setTestStatus('error');
        }
      } else if (settings.stt_provider === 'custom' && endpointInput) {
        // Test custom endpoint (just check if it responds)
        const response = await fetch(endpointInput, {
          method: 'HEAD',
          headers: apiKeyInput ? { 'Authorization': `Bearer ${apiKeyInput}` } : {},
        }).catch(() => null);
        
        if (response?.ok) {
          setTestStatus('success');
        } else {
          setTestStatus('error');
        }
      }
    } catch {
      setTestStatus('error');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          {t('profile.sttConfiguration', 'Reconhecimento de Voz (STT)')}
        </CardTitle>
        <CardDescription>
          {t('profile.sttConfigurationDescription', 'Configure o provedor de reconhecimento de voz para transcrição')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('profile.sttProvider', 'Provedor de Transcrição')}
          </Label>
          
          <div className="grid gap-3">
            {STT_PROVIDERS.map((provider) => (
              <div
                key={provider.id}
                className={cn(
                  'relative flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-colors',
                  settings.stt_provider === provider.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
                onClick={() => !disabled && handleProviderChange(provider.id)}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{provider.name}</span>
                    {settings.stt_provider === provider.id && (
                      <Badge variant="secondary" className="text-xs">
                        {t('profile.active', 'Ativo')}
                      </Badge>
                    )}
                    {!provider.requiresApiKey && (
                      <Badge variant="outline" className="text-xs">
                        {t('profile.free', 'Gratuito')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {provider.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {provider.features.realtime && (
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                        Tempo Real
                      </Badge>
                    )}
                    {provider.features.fileUpload && (
                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                        Upload de Áudio
                      </Badge>
                    )}
                    {provider.features.streaming && (
                      <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30">
                        Streaming
                      </Badge>
                    )}
                  </div>
                </div>
                {settings.stt_provider === provider.id && (
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* API Key Configuration */}
        {currentProvider?.requiresApiKey && (
          <div className="space-y-3 pt-4 border-t">
            <Label className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              {t('profile.sttApiKey', 'Chave da API')}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={settings.stt_provider === 'openai-whisper' ? 'sk-...' : 'Sua chave de API'}
                  disabled={disabled || isSaving}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                onClick={handleSaveApiKey}
                disabled={disabled || isSaving || !apiKeyInput}
                size="sm"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save', 'Salvar')}
              </Button>
            </div>
            
            {settings.stt_provider === 'openai-whisper' && (
              <p className="text-xs text-muted-foreground">
                Obtenha sua API key em{' '}
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  platform.openai.com/api-keys
                </a>
              </p>
            )}
          </div>
        )}

        {/* Custom Endpoint Configuration */}
        {currentProvider?.requiresEndpoint && (
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              {t('profile.sttEndpoint', 'URL do Endpoint')}
            </Label>
            <div className="flex gap-2">
              <Input
                type="url"
                value={endpointInput}
                onChange={(e) => setEndpointInput(e.target.value)}
                placeholder="https://seu-servidor.com/v1/audio/transcriptions"
                disabled={disabled || isSaving}
                className="flex-1"
              />
              <Button
                onClick={handleSaveEndpoint}
                disabled={disabled || isSaving || !endpointInput}
                size="sm"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save', 'Salvar')}
              </Button>
            </div>
          </div>
        )}

        {/* Model Selection */}
        {currentProvider?.models && currentProvider.models.length > 0 && (
          <div className="space-y-3">
            <Label>{t('profile.sttModel', 'Modelo')}</Label>
            <Select
              value={settings.stt_model}
              onValueChange={(v) => onSave('stt_model', v)}
              disabled={disabled || isSaving}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentProvider.models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Test Connection */}
        {currentProvider?.requiresApiKey && apiKeyInput && (
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={disabled || testStatus === 'testing'}
              size="sm"
            >
              {testStatus === 'testing' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {t('profile.testConnection', 'Testar Conexão')}
            </Button>
            
            {testStatus === 'success' && (
              <Alert className="flex-1 py-2 border-green-500/30 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600 text-sm">
                  {t('profile.connectionSuccess', 'Conexão estabelecida com sucesso!')}
                </AlertDescription>
              </Alert>
            )}
            
            {testStatus === 'error' && (
              <Alert variant="destructive" className="flex-1 py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {t('profile.connectionError', 'Falha na conexão. Verifique sua API key.')}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Web Speech API Info */}
        {settings.stt_provider === 'web-speech-api' && (
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <Globe className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-700 dark:text-blue-400">
              {t('profile.webSpeechInfo', 'A Web Speech API é processada pelo navegador. No Chrome, a transcrição é enviada aos servidores do Google. O Firefox usa processamento local.')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
