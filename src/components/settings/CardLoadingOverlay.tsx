import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface CardLoadingOverlayProps {
  isLoading: boolean;
  loadingText?: string;
  variant?: 'overlay' | 'skeleton';
  className?: string;
}

export function CardLoadingOverlay({ 
  isLoading, 
  loadingText = 'Processando...', 
  variant = 'overlay',
  className 
}: CardLoadingOverlayProps) {
  if (!isLoading) return null;

  if (variant === 'skeleton') {
    return (
      <div className={cn(
        "absolute inset-0 bg-card/80 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg",
        className
      )}>
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-1">
            <div className="h-2 w-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="h-2 w-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2 w-2 bg-primary/60 rounded-full animate-bounce" />
          </div>
          {loadingText && (
            <span className="text-xs text-muted-foreground">{loadingText}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "absolute inset-0 bg-card/90 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg transition-opacity duration-200",
      className
    )}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>{loadingText}</span>
      </div>
    </div>
  );
}

// Skeleton placeholder for cards
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "bg-card rounded-lg border border-border p-4 space-y-3 animate-pulse",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-muted rounded-lg" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
          </div>
        </div>
        <div className="h-5 w-10 bg-muted rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-3/4 bg-muted rounded" />
      </div>
      <div className="flex gap-2 pt-2 border-t">
        <div className="h-7 w-16 bg-muted rounded" />
        <div className="h-7 w-16 bg-muted rounded" />
      </div>
    </div>
  );
}

// Inline loading indicator for buttons/actions
export function InlineLoader({ 
  text = 'Carregando...', 
  size = 'sm' 
}: { 
  text?: string; 
  size?: 'sm' | 'md'; 
}) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  
  return (
    <span className={cn("flex items-center gap-1.5", textSize)}>
      <Loader2 className={cn(iconSize, "animate-spin")} />
      {text}
    </span>
  );
}
