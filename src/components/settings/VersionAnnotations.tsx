import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  QuestionVersion, 
  VersionAnnotation,
  addVersionAnnotation,
  updateVersionAnnotation,
  deleteVersionAnnotation,
  formatVersionDate
} from '@/lib/questionVersioning';
import { MessageSquare, Plus, Pencil, Trash2, X, Check, Send } from 'lucide-react';

interface VersionAnnotationsProps {
  version: QuestionVersion;
  onAnnotationsChange: (versionId: string, annotations: VersionAnnotation[]) => void;
}

export function VersionAnnotations({ version, onAnnotationsChange }: VersionAnnotationsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newAnnotationText, setNewAnnotationText] = useState('');
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddAnnotation = async () => {
    if (!newAnnotationText.trim()) {
      toast.error('Digite uma anotação');
      return;
    }

    setSaving(true);
    try {
      const newAnnotation = await addVersionAnnotation(version.id, newAnnotationText.trim());
      if (newAnnotation) {
        onAnnotationsChange(version.id, [...version.annotations, newAnnotation]);
        setNewAnnotationText('');
        setIsAdding(false);
        toast.success('Anotação adicionada');
      } else {
        toast.error('Erro ao adicionar anotação');
      }
    } catch (error) {
      toast.error('Erro ao adicionar anotação');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAnnotation = async (annotationId: string) => {
    if (!editingText.trim()) {
      toast.error('Digite uma anotação');
      return;
    }

    setSaving(true);
    try {
      const success = await updateVersionAnnotation(version.id, annotationId, editingText.trim());
      if (success) {
        const updatedAnnotations = version.annotations.map(a => 
          a.id === annotationId ? { ...a, text: editingText.trim() } : a
        );
        onAnnotationsChange(version.id, updatedAnnotations);
        setEditingAnnotationId(null);
        setEditingText('');
        toast.success('Anotação atualizada');
      } else {
        toast.error('Erro ao atualizar anotação');
      }
    } catch (error) {
      toast.error('Erro ao atualizar anotação');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    setSaving(true);
    try {
      const success = await deleteVersionAnnotation(version.id, annotationId);
      if (success) {
        const updatedAnnotations = version.annotations.filter(a => a.id !== annotationId);
        onAnnotationsChange(version.id, updatedAnnotations);
        toast.success('Anotação removida');
      } else {
        toast.error('Erro ao remover anotação');
      }
    } catch (error) {
      toast.error('Erro ao remover anotação');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (annotation: VersionAnnotation) => {
    setEditingAnnotationId(annotation.id);
    setEditingText(annotation.text);
  };

  const cancelEditing = () => {
    setEditingAnnotationId(null);
    setEditingText('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Anotações
          {version.annotations.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {version.annotations.length}
            </Badge>
          )}
        </h4>
        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-7"
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        )}
      </div>

      {/* Add new annotation */}
      {isAdding && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-3 space-y-2">
            <Textarea
              placeholder="Digite sua anotação..."
              value={newAnnotationText}
              onChange={(e) => setNewAnnotationText(e.target.value)}
              className="min-h-[60px] text-sm resize-none"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewAnnotationText('');
                }}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleAddAnnotation}
                disabled={saving || !newAnnotationText.trim()}
              >
                <Send className="h-4 w-4 mr-1" />
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Annotations list */}
      {version.annotations.length === 0 && !isAdding ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          Nenhuma anotação ainda
        </p>
      ) : (
        <div className="space-y-2">
          {version.annotations.map((annotation) => (
            <Card key={annotation.id} className="overflow-hidden">
              <CardContent className="p-3">
                {editingAnnotationId === annotation.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="min-h-[60px] text-sm resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEditing}
                        disabled={saving}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateAnnotation(annotation.id)}
                        disabled={saving || !editingText.trim()}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {annotation.text}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        {formatVersionDate(annotation.createdAt)}
                        {annotation.author && ` • ${annotation.author}`}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => startEditing(annotation)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir anotação?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteAnnotation(annotation.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
