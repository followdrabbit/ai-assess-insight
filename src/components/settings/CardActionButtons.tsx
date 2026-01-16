import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { LucideIcon, Pencil, Trash2, Copy, Download, History, Power, Eye, RotateCcw } from 'lucide-react';

export interface ActionButtonConfig {
  type: 'edit' | 'delete' | 'duplicate' | 'export' | 'history' | 'toggle' | 'view' | 'restore' | 'custom';
  label?: string;
  icon?: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** For toggle actions - current state */
  isActive?: boolean;
  /** For destructive actions - requires confirmation */
  requiresConfirmation?: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
  confirmActionLabel?: string;
  /** Custom class name */
  className?: string;
  /** Hide the button */
  hidden?: boolean;
  /** Show only icon (no label) */
  iconOnly?: boolean;
}

interface CardActionButtonsProps {
  actions: ActionButtonConfig[];
  /** Container class name */
  className?: string;
  /** Show border on top */
  withBorder?: boolean;
  /** Size variant */
  size?: 'sm' | 'default';
}

const DEFAULT_ICONS: Record<string, LucideIcon> = {
  edit: Pencil,
  delete: Trash2,
  duplicate: Copy,
  export: Download,
  history: History,
  toggle: Power,
  view: Eye,
  restore: RotateCcw,
};

const DEFAULT_LABELS: Record<string, string> = {
  edit: 'Editar',
  delete: 'Excluir',
  duplicate: 'Duplicar',
  export: 'Exportar',
  history: 'Histórico',
  toggle: 'Alternar',
  view: 'Visualizar',
  restore: 'Restaurar',
};

export function CardActionButtons({ 
  actions, 
  className,
  withBorder = true,
  size = 'sm'
}: CardActionButtonsProps) {
  const visibleActions = actions.filter(a => !a.hidden);

  if (visibleActions.length === 0) return null;

  const buttonClasses = size === 'sm' 
    ? "h-7 px-2 text-xs gap-1" 
    : "gap-2";

  const iconClasses = size === 'sm' ? "h-3 w-3" : "h-4 w-4";

  const renderButton = (action: ActionButtonConfig, index: number) => {
    const Icon = action.icon || DEFAULT_ICONS[action.type] || Pencil;
    const label = action.label || DEFAULT_LABELS[action.type] || '';
    const isDestructive = action.type === 'delete';

    // Handle toggle button label
    const displayLabel = action.type === 'toggle' 
      ? (action.isActive ? 'Desabilitar' : 'Habilitar')
      : label;

    const buttonContent = (
      <Button
        variant="ghost"
        size={size}
        onClick={action.requiresConfirmation ? undefined : action.onClick}
        disabled={action.disabled}
        className={cn(
          buttonClasses,
          isDestructive && "text-destructive hover:text-destructive hover:bg-destructive/10",
          action.loading && "opacity-50",
          action.className
        )}
        title={action.iconOnly ? displayLabel : undefined}
      >
        <Icon className={cn(iconClasses, action.loading && "animate-pulse")} />
        {!action.iconOnly && displayLabel}
      </Button>
    );

    // Wrap destructive/confirmation actions with AlertDialog
    if (action.requiresConfirmation) {
      return (
        <AlertDialog key={index}>
          <AlertDialogTrigger asChild>
            {buttonContent}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {action.confirmTitle || 'Confirmar ação'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {action.confirmDescription || 'Tem certeza que deseja continuar?'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={action.onClick}>
                {action.confirmActionLabel || 'Confirmar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }

    return <span key={index}>{buttonContent}</span>;
  };

  return (
    <div className={cn(
      "flex items-center gap-1",
      withBorder && "pt-2 border-t",
      className
    )}>
      {visibleActions.map((action, index) => renderButton(action, index))}
    </div>
  );
}

// Preset configurations for common use cases
export const createEditAction = (onClick: () => void, options?: Partial<ActionButtonConfig>): ActionButtonConfig => ({
  type: 'edit',
  onClick,
  ...options,
});

export const createDeleteAction = (
  onClick: () => void, 
  options?: Partial<ActionButtonConfig> & { 
    itemName?: string;
    isDefault?: boolean;
  }
): ActionButtonConfig => ({
  type: 'delete',
  onClick,
  requiresConfirmation: true,
  confirmTitle: options?.isDefault ? 'Desabilitar item?' : 'Excluir item?',
  confirmDescription: options?.isDefault
    ? `Você deseja desabilitar "${options?.itemName || 'este item'}"? Poderá ser restaurado posteriormente.`
    : `Você deseja excluir permanentemente "${options?.itemName || 'este item'}"? Esta ação não pode ser desfeita.`,
  confirmActionLabel: options?.isDefault ? 'Sim, Desabilitar' : 'Sim, Excluir',
  label: options?.isDefault ? 'Desabilitar' : 'Excluir',
  ...options,
});

export const createDuplicateAction = (onClick: () => void, options?: Partial<ActionButtonConfig>): ActionButtonConfig => ({
  type: 'duplicate',
  onClick,
  ...options,
});

export const createExportAction = (onClick: () => void, loading?: boolean, options?: Partial<ActionButtonConfig>): ActionButtonConfig => ({
  type: 'export',
  onClick,
  loading,
  ...options,
});

export const createHistoryAction = (onClick: () => void, options?: Partial<ActionButtonConfig>): ActionButtonConfig => ({
  type: 'history',
  onClick,
  iconOnly: true,
  ...options,
});

export const createToggleAction = (
  onClick: () => void, 
  isActive: boolean, 
  options?: Partial<ActionButtonConfig>
): ActionButtonConfig => ({
  type: 'toggle',
  onClick,
  isActive,
  ...options,
});

export const createRestoreAction = (onClick: () => void, options?: Partial<ActionButtonConfig>): ActionButtonConfig => ({
  type: 'restore',
  onClick,
  ...options,
});
