import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Mic, MicOff, Volume2, VolumeX, Trash2, StopCircle, Bot, User, Loader2, Command, Navigation, Database, Globe, FileDown, Sparkles, AlertCircle, Pause, Play, SkipForward, Fingerprint, ShieldCheck, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useAIAssistant, ChatMessage } from '@/hooks/useAIAssistant';
import { useSyncedSpeechRecognition } from '@/hooks/useSyncedSpeechRecognition';
import { useSyncedSpeechSynthesis } from '@/hooks/useSyncedSpeechSynthesis';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { useVoiceSettings } from '@/contexts/VoiceSettingsContext';
import { toast } from 'sonner';

export function AIAssistantChat() {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageRef = useRef<string>('');

  const { settings: voiceSettings, updateSettings: updateVoiceSettings } = useVoiceSettings();

  const { messages, isLoading, error, sendMessage, clearMessages, stopGeneration, addSystemMessage, currentProvider } = useAIAssistant();
  const { 
    isListening, 
    transcript, 
    interimTranscript,
    confidence,
    isSupported: sttSupported, 
    error: sttError,
    currentProvider: sttProvider,
    supportsRealtime,
    isVoiceProfileEnabled,
    isVoiceVerified,
    verificationResult,
    voiceRejectedCount,
    startListening, 
    stopListening, 
    resetTranscript,
    clearError: clearSttError,
    resetVoiceRejectedCount 
  } = useSyncedSpeechRecognition();
  const { 
    isSpeaking, 
    isPaused,
    isSupported: ttsSupported, 
    error: ttsError,
    progress: speakProgress,
    autoSpeak,
    speak, 
    stop: stopSpeaking,
    pause: pauseSpeaking,
    resume: resumeSpeaking,
    skip: skipSpeaking,
    clearError: clearTtsError
  } = useSyncedSpeechSynthesis();
  const { executeCommand, getDataFromCommand, isCommand, getAllCommands } = useVoiceCommands();

  // Process voice commands when transcript changes
  const processVoiceCommand = useCallback((text: string) => {
    if (!text.trim()) return false;

    // Check for navigation commands first
    const navResult = executeCommand(text);
    if (navResult.matched) {
      toast.success(t('voiceCommands.executed', 'Comando executado: {{command}}', { command: navResult.description }));
      if (autoSpeak) {
        speak(navResult.description || 'Comando executado');
      }
      return true;
    }

    // Check for data commands
    const dataResult = getDataFromCommand(text);
    if (dataResult.matched && dataResult.data) {
      // Add the data as a system message to the chat
      addSystemMessage(dataResult.data);
      if (autoSpeak) {
        speak(dataResult.data.replace(/\*\*/g, '')); // Remove markdown for speech
      }
      return true;
    }

    return false;
  }, [executeCommand, getDataFromCommand, addSystemMessage, autoSpeak, speak, t]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Update input with speech transcript
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  // Auto-speak new assistant messages
  useEffect(() => {
    if (!autoSpeak || !ttsSupported) return;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && !isLoading && lastMessage.content !== lastMessageRef.current) {
      lastMessageRef.current = lastMessage.content;
      speak(lastMessage.content);
    }
  }, [messages, isLoading, autoSpeak, ttsSupported, speak]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const message = inputValue;
    setInputValue('');
    resetTranscript();

    // Check if it's a voice command first
    if (isCommand(message)) {
      const executed = processVoiceCommand(message);
      if (executed) return;
    }

    // Otherwise send to AI
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  const toggleAutoSpeak = async () => {
    if (isSpeaking) {
      stopSpeaking();
    }
    // Update local context state (optimistic update)
    updateVoiceSettings({ voice_auto_speak: !autoSpeak });
    
    // Save to database
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ voice_auto_speak: !autoSpeak, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
      }
    } catch (err) {
      console.error('Error saving auto-speak preference:', err);
    }
  };

  const speakMessage = (content: string) => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(content);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] max-h-[80vh] border-border/50">
      <CardHeader className="pb-3 border-b border-border/30 px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
              <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg truncate">{t('aiAssistant.title', 'Security AI Assistant')}</CardTitle>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden xs:block">
                  {t('aiAssistant.subtitle', 'Ask questions about your security posture')}
                </p>
                {currentProvider && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-3.5 sm:h-4 gap-0.5 sm:gap-1 cursor-default flex-shrink-0">
                        <Sparkles className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                        <span className="truncate max-w-[60px] sm:max-w-none">{currentProvider.name}</span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <div className="text-xs">
                        <div className="font-medium">{t('aiAssistant.currentProvider', 'Current Provider')}</div>
                        <div className="text-muted-foreground">{currentProvider.modelId}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            {ttsSupported && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={autoSpeak ? 'default' : 'ghost'}
                    size="icon"
                    onClick={toggleAutoSpeak}
                    className="h-7 w-7 sm:h-8 sm:w-8"
                  >
                    {autoSpeak ? <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <VolumeX className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {autoSpeak ? t('aiAssistant.disableAutoSpeak', 'Disable auto-speak') : t('aiAssistant.enableAutoSpeak', 'Enable auto-speak')}
                </TooltipContent>
              </Tooltip>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                  <Command className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 sm:w-80" align="end">
                <div className="space-y-3">
                  <div className="font-medium text-sm">{t('voiceCommands.title', 'Voice Commands')}</div>
                  <p className="text-xs text-muted-foreground">
                    {t('voiceCommands.description', 'Say or type these commands to control the app')}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Navigation className="h-3 w-3" />
                      {t('voiceCommands.navigationCategory', 'Navigation')}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {getAllCommands().filter(c => c.category === 'navigation').map(cmd => (
                        <Badge key={cmd.id} variant="secondary" className="text-xs cursor-pointer" onClick={() => setInputValue(cmd.description)}>
                          {cmd.description}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mt-2">
                      <Database className="h-3 w-3" />
                      {t('voiceCommands.dataCategory', 'Data')}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {getAllCommands().filter(c => c.category === 'data').map(cmd => (
                        <Badge key={cmd.id} variant="outline" className="text-xs cursor-pointer" onClick={() => setInputValue(cmd.description)}>
                          {cmd.description}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mt-2">
                      <Globe className="h-3 w-3" />
                      {t('voiceCommands.domainCategory', 'Security Domains')}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {getAllCommands().filter(c => c.category === 'domain').map(cmd => (
                        <Badge key={cmd.id} variant="default" className="text-xs cursor-pointer" onClick={() => setInputValue(cmd.description)}>
                          {cmd.description}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mt-2">
                      <FileDown className="h-3 w-3" />
                      {t('voiceCommands.exportCategory', 'Export')}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {getAllCommands().filter(c => c.category === 'ui').map(cmd => (
                        <Badge key={cmd.id} variant="secondary" className="text-xs cursor-pointer bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20" onClick={() => setInputValue(cmd.description)}>
                          {cmd.description}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearMessages}
                  disabled={messages.length === 0}
                  className="h-7 w-7 sm:h-8 sm:w-8"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('aiAssistant.clearChat', 'Clear chat')}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
              <Bot className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm font-medium mb-2">
                {t('aiAssistant.welcomeTitle', 'Welcome to the Security AI Assistant')}
              </p>
              <p className="text-xs max-w-sm">
                {t('aiAssistant.welcomeMessage', 'I can analyze your security assessment, explain frameworks, and provide recommendations based on your current maturity level.')}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {[
                  t('aiAssistant.suggestedQuestion1', 'What are my top priority gaps?'),
                  t('aiAssistant.suggestedQuestion2', 'Summarize my security posture'),
                  t('aiAssistant.suggestedQuestion3', 'How can I improve my maturity level?'),
                ].map((suggestion, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setInputValue(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onSpeak={ttsSupported ? speakMessage : undefined}
                  isSpeaking={isSpeaking}
                />
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{t('aiAssistant.thinking', 'Thinking...')}</span>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Speech errors */}
        {(sttError || ttsError) && (
          <div className="px-3 sm:px-4 py-2">
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-3.5 w-3.5" />
              <AlertDescription className="text-xs ml-2">
                {sttError?.message || ttsError?.message}
                <Button 
                  variant="link" 
                  className="h-auto p-0 ml-2 text-xs" 
                  onClick={() => { clearSttError(); clearTtsError(); }}
                >
                  {t('common.dismiss', 'Dismiss')}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Speech recognition indicator */}
        {isListening && (
          <div className="px-3 sm:px-4 py-2 border-t border-border/30 bg-primary/5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-muted-foreground">
                  {t('aiAssistant.recognizing', 'Recognizing speech...')}
                </span>
                {confidence > 0 && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1">
                    {Math.round(confidence * 100)}% {t('aiAssistant.confidence', 'confidence')}
                  </Badge>
                )}
              </div>
              {interimTranscript && (
                <span className="text-muted-foreground italic truncate max-w-[150px]">
                  "{interimTranscript}"
                </span>
              )}
            </div>
          </div>
        )}

        {/* Speech synthesis progress */}
        {isSpeaking && (
          <div className="px-3 sm:px-4 py-2 border-t border-border/30 bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Progress value={speakProgress} className="h-1" />
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={isPaused ? resumeSpeaking : pauseSpeaking}
                    >
                      {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isPaused ? t('aiAssistant.resume', 'Resume') : t('aiAssistant.pause', 'Pause')}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={skipSpeaking}
                    >
                      <SkipForward className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('aiAssistant.skip', 'Skip')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={stopSpeaking}
                    >
                      <StopCircle className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('aiAssistant.stop', 'Stop')}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="p-3 sm:p-4 border-t border-border/30">
          <div className="flex gap-1.5 sm:gap-2">
            <div className="relative flex-1">
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? t('aiAssistant.listening', 'Listening...') : t('aiAssistant.placeholder', 'Type your question...')}
                className={cn(
                  "min-h-[40px] sm:min-h-[44px] max-h-[100px] sm:max-h-[120px] resize-none pr-9 sm:pr-10 text-sm",
                  isListening && "border-primary ring-1 ring-primary/50"
                )}
                disabled={isLoading}
              />
              {sttSupported && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleListening}
                      className={cn(
                        "absolute right-0.5 top-0.5 sm:right-1 sm:top-1 h-7 w-7 sm:h-8 sm:w-8",
                        isListening && "text-primary animate-pulse"
                      )}
                      disabled={isLoading}
                    >
                      {isListening ? <MicOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <div>
                        {isListening 
                          ? t('aiAssistant.stopListening', 'Stop listening') 
                          : t('aiAssistant.startListening', 'Start voice input')}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {sttProvider === 'openai-whisper' ? 'Whisper' : 
                         sttProvider === 'custom' ? 'Custom' : 'Web Speech API'}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {isLoading ? (
              <Button variant="destructive" size="icon" onClick={stopGeneration} className="h-10 w-10 sm:h-[44px] sm:w-[44px] flex-shrink-0">
                <StopCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="h-10 w-10 sm:h-[44px] sm:w-[44px] flex-shrink-0"
              >
                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}
          </div>
          {!sttSupported && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2">
              {t('aiAssistant.sttNotSupported', 'Voice input not supported in this browser')}
            </p>
          )}
          {sttSupported && !supportsRealtime && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2">
              {t('aiAssistant.whisperMode', 'Whisper: Recording will be transcribed when you stop')}
            </p>
          )}
          
          {/* Voice Profile Verification Indicator */}
          {sttSupported && isVoiceProfileEnabled && (
            <div className="flex items-center gap-2 mt-2">
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium transition-colors",
                isVoiceVerified === true && "bg-green-500/10 text-green-600 dark:text-green-400",
                isVoiceVerified === false && "bg-red-500/10 text-red-600 dark:text-red-400",
                isVoiceVerified === null && "bg-muted text-muted-foreground"
              )}>
                <Fingerprint className="h-3 w-3" />
                {isVoiceVerified === true && (
                  <>
                    <ShieldCheck className="h-3 w-3" />
                    <span>{t('voiceProfile.verified', 'Voz verificada')}</span>
                  </>
                )}
                {isVoiceVerified === false && (
                  <>
                    <ShieldX className="h-3 w-3" />
                    <span>{t('voiceProfile.rejected', 'Voz não reconhecida')}</span>
                  </>
                )}
                {isVoiceVerified === null && (
                  <span>{t('voiceProfile.active', 'Perfil de voz ativo')}</span>
                )}
              </div>
              {voiceRejectedCount > 0 && (
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                  {voiceRejectedCount} {t('voiceProfile.rejectedCount', 'rejeitado(s)')}
                </Badge>
              )}
              {verificationResult && isVoiceVerified !== null && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[9px] px-1.5 py-0 h-4 cursor-default",
                        isVoiceVerified ? "border-green-500/50" : "border-red-500/50"
                      )}
                    >
                      {Math.round(verificationResult.confidence * 100)}% confiança
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <div className="space-y-1">
                      <div>Score: {(verificationResult.matchScore * 100).toFixed(1)}%</div>
                      <div>Limiar: {(verificationResult.threshold * 100).toFixed(0)}%</div>
                      {verificationResult.details && (
                        <>
                          <div className="border-t pt-1 mt-1 text-muted-foreground">
                            <div>MFCC: {(verificationResult.details.mfccSimilarity * 100).toFixed(0)}%</div>
                            <div>Pitch: {(verificationResult.details.pitchSimilarity * 100).toFixed(0)}%</div>
                          </div>
                        </>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  onSpeak?: (content: string) => void;
  isSpeaking: boolean;
}

function MessageBubble({ message, onSpeak, isSpeaking }: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant';
  
  return (
    <div className={cn("flex gap-3", !isAssistant && "flex-row-reverse")}>
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isAssistant ? "bg-primary/10" : "bg-muted"
      )}>
        {isAssistant ? (
          <Bot className="h-4 w-4 text-primary" />
        ) : (
          <User className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className={cn(
        "flex-1 max-w-[80%] rounded-lg px-4 py-2.5 text-sm",
        isAssistant 
          ? "bg-muted/50 text-foreground" 
          : "bg-primary text-primary-foreground"
      )}>
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        {isAssistant && message.content && onSpeak && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-6 px-2 text-xs"
            onClick={() => onSpeak(message.content)}
          >
            {isSpeaking ? <VolumeX className="h-3 w-3 mr-1" /> : <Volume2 className="h-3 w-3 mr-1" />}
            {isSpeaking ? 'Stop' : 'Listen'}
          </Button>
        )}
      </div>
    </div>
  );
}
