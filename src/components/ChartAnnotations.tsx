import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Trash2, Edit2, X, Check, Flag, Calendar, AlertTriangle, Rocket, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  ChartAnnotation, 
  getChartAnnotations, 
  createChartAnnotation, 
  updateChartAnnotation, 
  deleteChartAnnotation 
} from '@/lib/database';
import { toast } from 'sonner';

interface ChartAnnotationsProps {
  securityDomainId?: string;
  onAnnotationsChange?: (annotations: ChartAnnotation[]) => void;
}

const annotationTypes = [
  { value: 'milestone', label: 'Marco', icon: Flag, color: '#3b82f6' },
  { value: 'audit', label: 'Auditoria', icon: FileText, color: '#8b5cf6' },
  { value: 'event', label: 'Evento', icon: Calendar, color: '#10b981' },
  { value: 'release', label: 'Release', icon: Rocket, color: '#f59e0b' },
  { value: 'incident', label: 'Incidente', icon: AlertTriangle, color: '#ef4444' },
];

export default function ChartAnnotations({ securityDomainId, onAnnotationsChange }: ChartAnnotationsProps) {
  const [annotations, setAnnotations] = useState<ChartAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formDate, setFormDate] = useState<Date | undefined>(new Date());
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<string>('milestone');

  useEffect(() => {
    loadAnnotations();
  }, [securityDomainId]);

  const loadAnnotations = async () => {
    setLoading(true);
    try {
      const data = await getChartAnnotations(securityDomainId);
      setAnnotations(data);
      onAnnotationsChange?.(data);
    } catch (error) {
      console.error('Error loading annotations:', error);
      toast.error('Erro ao carregar anotações');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormDate(new Date());
    setFormTitle('');
    setFormDescription('');
    setFormType('milestone');
    setEditingId(null);
  };

  const handleOpenDialog = (annotation?: ChartAnnotation) => {
    if (annotation) {
      setEditingId(annotation.id);
      setFormDate(parseISO(annotation.annotationDate));
      setFormTitle(annotation.title);
      setFormDescription(annotation.description || '');
      setFormType(annotation.annotationType);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formDate || !formTitle.trim()) {
      toast.error('Data e título são obrigatórios');
      return;
    }

    const typeConfig = annotationTypes.find(t => t.value === formType);
    const annotationData = {
      annotationDate: format(formDate, 'yyyy-MM-dd'),
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      annotationType: formType,
      color: typeConfig?.color || '#3b82f6',
      securityDomainId,
    };

    try {
      if (editingId) {
        await updateChartAnnotation(editingId, annotationData);
        toast.success('Anotação atualizada');
      } else {
        await createChartAnnotation(annotationData);
        toast.success('Anotação criada');
      }
      
      setDialogOpen(false);
      resetForm();
      await loadAnnotations();
    } catch (error) {
      console.error('Error saving annotation:', error);
      toast.error('Erro ao salvar anotação');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteChartAnnotation(id);
      toast.success('Anotação removida');
      await loadAnnotations();
    } catch (error) {
      console.error('Error deleting annotation:', error);
      toast.error('Erro ao remover anotação');
    }
  };

  const getTypeConfig = (type: string) => {
    return annotationTypes.find(t => t.value === type) || annotationTypes[0];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Marcos e Anotações</h4>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Anotação' : 'Nova Anotação'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {formDate ? format(formDate, 'PPP', { locale: ptBR }) : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formDate}
                      onSelect={setFormDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {annotationTypes.map(type => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" style={{ color: type.color }} />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Título</label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Auditoria SOC 2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição (opcional)</label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detalhes adicionais..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  <Check className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : annotations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma anotação. Clique em "Adicionar" para marcar datas importantes.
        </p>
      ) : (
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
          {annotations.map(annotation => {
            const typeConfig = getTypeConfig(annotation.annotationType);
            const Icon = typeConfig.icon;
            return (
              <div
                key={annotation.id}
                className="flex items-start gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
              >
                <Icon 
                  className="h-4 w-4 mt-0.5 flex-shrink-0" 
                  style={{ color: annotation.color || typeConfig.color }} 
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{annotation.title}</span>
                    <Badge variant="secondary" className="text-xs">
                      {format(parseISO(annotation.annotationDate), 'dd/MM/yy', { locale: ptBR })}
                    </Badge>
                  </div>
                  {annotation.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {annotation.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={() => handleOpenDialog(annotation)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(annotation.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
