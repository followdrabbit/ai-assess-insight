import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  QuestionVersion, 
  VERSION_TAG_OPTIONS,
  addVersionTag,
  removeVersionTag
} from '@/lib/questionVersioning';
import { Tag, Plus, X, Check } from 'lucide-react';

interface VersionTagsProps {
  version: QuestionVersion;
  onTagsChange: (versionId: string, tags: string[]) => void;
  compact?: boolean;
}

export function VersionTags({ version, onTagsChange, compact = false }: VersionTagsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const getTagOption = (tagId: string) => {
    return VERSION_TAG_OPTIONS.find(t => t.id === tagId);
  };

  const handleAddTag = async (tagId: string) => {
    if (version.tags.includes(tagId)) return;
    
    setSaving(true);
    try {
      const success = await addVersionTag(version.id, tagId);
      if (success) {
        onTagsChange(version.id, [...version.tags, tagId]);
        toast.success('Tag adicionada');
      } else {
        toast.error('Erro ao adicionar tag');
      }
    } catch (error) {
      toast.error('Erro ao adicionar tag');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTag = async (tagId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    setSaving(true);
    try {
      const success = await removeVersionTag(version.id, tagId);
      if (success) {
        onTagsChange(version.id, version.tags.filter(t => t !== tagId));
        toast.success('Tag removida');
      } else {
        toast.error('Erro ao remover tag');
      }
    } catch (error) {
      toast.error('Erro ao remover tag');
    } finally {
      setSaving(false);
    }
  };

  const availableTags = VERSION_TAG_OPTIONS.filter(t => !version.tags.includes(t.id));

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {version.tags.map(tagId => {
          const option = getTagOption(tagId);
          if (!option) return null;
          return (
            <Badge 
              key={tagId} 
              variant="outline" 
              className={cn("text-[10px] py-0 h-5", option.color)}
            >
              {option.label}
            </Badge>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Tags
          {version.tags.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {version.tags.length}
            </Badge>
          )}
        </h4>
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7" disabled={saving}>
              <Plus className="h-3 w-3 mr-1" />
              Adicionar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                Selecione uma tag
              </p>
              {availableTags.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Todas as tags já foram aplicadas
                </p>
              ) : (
                availableTags.map(option => (
                  <button
                    key={option.id}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors hover:bg-muted",
                      saving && "opacity-50 pointer-events-none"
                    )}
                    onClick={() => {
                      handleAddTag(option.id);
                      setIsOpen(false);
                    }}
                  >
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", option.color)}
                    >
                      {option.label}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {version.tags.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          Nenhuma tag aplicada
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {version.tags.map(tagId => {
            const option = getTagOption(tagId);
            if (!option) return null;
            return (
              <Badge 
                key={tagId} 
                variant="outline" 
                className={cn(
                  "text-xs gap-1 pr-1",
                  option.color,
                  saving && "opacity-50"
                )}
              >
                {option.label}
                <button
                  className="ml-1 hover:bg-black/10 rounded p-0.5 transition-colors"
                  onClick={(e) => handleRemoveTag(tagId, e)}
                  disabled={saving}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Inline tag display for version cards
export function VersionTagsBadges({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tags.map(tagId => {
        const option = VERSION_TAG_OPTIONS.find(t => t.id === tagId);
        if (!option) return null;
        return (
          <Badge 
            key={tagId} 
            variant="outline" 
            className={cn("text-[10px] py-0 h-5", option.color)}
          >
            {option.label}
          </Badge>
        );
      })}
    </div>
  );
}
