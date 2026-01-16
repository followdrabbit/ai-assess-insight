import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AIAssistantChat } from './AIAssistantChat';

interface AIAssistantPanelProps {
  variant?: 'fab' | 'sheet' | 'dialog';
  className?: string;
}

export function AIAssistantPanel({ variant = 'fab', className }: AIAssistantPanelProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (variant === 'sheet') {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button className={cn("gap-2", className)}>
            <Bot className="h-4 w-4" />
            {t('aiAssistant.openButton', 'AI Assistant')}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          <AIAssistantChat />
        </SheetContent>
      </Sheet>
    );
  }

  if (variant === 'dialog') {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className={cn("gap-2", className)}>
            <Bot className="h-4 w-4" />
            {t('aiAssistant.openButton', 'AI Assistant')}
          </Button>
        </DialogTrigger>
        <DialogContent className={cn(
          "p-0 gap-0 overflow-hidden transition-all duration-300",
          isExpanded ? "max-w-4xl h-[90vh]" : "max-w-lg h-[600px]"
        )}>
          <div className="absolute top-2 right-10 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
          <AIAssistantChat />
        </DialogContent>
      </Dialog>
    );
  }

  // FAB variant (default)
  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-20 right-4 sm:bottom-6 sm:right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg z-50",
          "hover:scale-110 transition-transform active:scale-95",
          isOpen && "hidden",
          className
        )}
        size="icon"
      >
        <Bot className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>

      {/* Chat Panel */}
      <div className={cn(
        "fixed z-50 transition-all duration-300",
        "bottom-4 right-4 sm:bottom-6 sm:right-6",
        "w-[calc(100vw-32px)] sm:w-[400px] max-w-[400px]",
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
      )}>
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-background shadow-md z-10 active:scale-95"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <AIAssistantChat />
        </div>
      </div>
    </>
  );
}
