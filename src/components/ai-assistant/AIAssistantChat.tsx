import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Mic, MicOff, Volume2, VolumeX, Trash2, StopCircle, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAIAssistant, ChatMessage } from '@/hooks/useAIAssistant';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { toast } from 'sonner';

export function AIAssistantChat() {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [autoSpeak, setAutoSpeak] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageRef = useRef<string>('');

  const { messages, isLoading, error, sendMessage, clearMessages, stopGeneration } = useAIAssistant();
  const { isListening, transcript, isSupported: sttSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const { isSpeaking, isSupported: ttsSupported, speak, stop: stopSpeaking } = useSpeechSynthesis();

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

  const toggleAutoSpeak = () => {
    if (isSpeaking) {
      stopSpeaking();
    }
    setAutoSpeak(!autoSpeak);
  };

  const speakMessage = (content: string) => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(content);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] border-border/50">
      <CardHeader className="pb-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{t('aiAssistant.title', 'Security AI Assistant')}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('aiAssistant.subtitle', 'Ask questions about your security posture')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {ttsSupported && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={autoSpeak ? 'default' : 'ghost'}
                    size="icon"
                    onClick={toggleAutoSpeak}
                    className="h-8 w-8"
                  >
                    {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {autoSpeak ? t('aiAssistant.disableAutoSpeak', 'Disable auto-speak') : t('aiAssistant.enableAutoSpeak', 'Enable auto-speak')}
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearMessages}
                  disabled={messages.length === 0}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
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

        {/* Input area */}
        <div className="p-4 border-t border-border/30">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? t('aiAssistant.listening', 'Listening...') : t('aiAssistant.placeholder', 'Type your question...')}
                className={cn(
                  "min-h-[44px] max-h-[120px] resize-none pr-10",
                  isListening && "border-primary ring-1 ring-primary/50"
                )}
                disabled={isLoading}
              />
              {sttSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleListening}
                  className={cn(
                    "absolute right-1 top-1 h-8 w-8",
                    isListening && "text-primary animate-pulse"
                  )}
                  disabled={isLoading}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
            </div>
            {isLoading ? (
              <Button variant="destructive" size="icon" onClick={stopGeneration} className="h-[44px] w-[44px]">
                <StopCircle className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="h-[44px] w-[44px]"
              >
                <Send className="h-5 w-5" />
              </Button>
            )}
          </div>
          {!sttSupported && (
            <p className="text-xs text-muted-foreground mt-2">
              {t('aiAssistant.sttNotSupported', 'Voice input not supported in this browser')}
            </p>
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
