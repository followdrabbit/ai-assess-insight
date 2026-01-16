import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { QuestionVersion, compareVersions, VersionDiff, CHANGE_TYPE_LABELS, formatVersionDate } from '@/lib/questionVersioning';
import { ArrowRight, GitCompare, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

interface VersionComparisonViewProps {
  versions: QuestionVersion[];
  onRevert?: (version: QuestionVersion) => void;
  reverting?: boolean;
}

interface FieldChange {
  field: string;
  label: string;
  values: { versionNumber: number; value: string }[];
}

export function VersionComparisonView({ versions, onRevert, reverting }: VersionComparisonViewProps) {
  const [selectedVersionIds, setSelectedVersionIds] = useState<string[]>([]);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const toggleVersion = (versionId: string) => {
    setSelectedVersionIds(prev => 
      prev.includes(versionId) 
        ? prev.filter(id => id !== versionId)
        : [...prev, versionId]
    );
  };

  const selectAll = () => {
    setSelectedVersionIds(versions.map(v => v.id));
  };

  const clearSelection = () => {
    setSelectedVersionIds([]);
  };

  const toggleFieldExpand = (field: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  // Get selected versions sorted by version number (oldest first for timeline)
  const selectedVersions = useMemo(() => {
    return versions
      .filter(v => selectedVersionIds.includes(v.id))
      .sort((a, b) => a.versionNumber - b.versionNumber);
  }, [versions, selectedVersionIds]);

  // Build a timeline of changes across all selected versions
  const changeTimeline = useMemo(() => {
    if (selectedVersions.length < 2) return [];

    const fieldLabels: Record<string, string> = {
      questionText: 'Texto da Pergunta',
      domainId: 'Área',
      subcatId: 'Subcategoria',
      criticality: 'Criticidade',
      ownershipType: 'Responsável',
      riskSummary: 'Resumo de Risco',
      expectedEvidence: 'Evidência Esperada',
      imperativeChecks: 'Verificações',
      frameworks: 'Frameworks'
    };

    const changesMap = new Map<string, FieldChange>();

    // Compare each version with the next one
    for (let i = 0; i < selectedVersions.length - 1; i++) {
      const oldV = selectedVersions[i];
      const newV = selectedVersions[i + 1];
      const diffs = compareVersions(oldV, newV);

      for (const diff of diffs) {
        if (!changesMap.has(diff.field)) {
          changesMap.set(diff.field, {
            field: diff.field,
            label: diff.label,
            values: [{ versionNumber: oldV.versionNumber, value: diff.oldValue }]
          });
        }
        const fieldChange = changesMap.get(diff.field)!;
        
        // Avoid duplicates
        const lastEntry = fieldChange.values[fieldChange.values.length - 1];
        if (lastEntry.versionNumber !== newV.versionNumber) {
          fieldChange.values.push({ versionNumber: newV.versionNumber, value: diff.newValue });
        }
      }
    }

    // Sort by most changes
    return Array.from(changesMap.values()).sort((a, b) => b.values.length - a.values.length);
  }, [selectedVersions]);

  // Calculate total changes between first and last selected version
  const totalChanges = useMemo(() => {
    if (selectedVersions.length < 2) return null;
    const first = selectedVersions[0];
    const last = selectedVersions[selectedVersions.length - 1];
    return compareVersions(first, last);
  }, [selectedVersions]);

  return (
    <div className="space-y-4">
      {/* Version Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            Selecione versões para comparar
          </h4>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Selecionar todas
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Limpar
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[180px]">
          <div className="space-y-1 pr-4">
            {versions.map((version, index) => (
              <div 
                key={version.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer hover:bg-muted/50",
                  selectedVersionIds.includes(version.id) && "border-primary bg-primary/5"
                )}
                onClick={() => toggleVersion(version.id)}
              >
                <Checkbox 
                  checked={selectedVersionIds.includes(version.id)}
                  onCheckedChange={() => toggleVersion(version.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Badge variant="outline" className="text-xs shrink-0">
                    v{version.versionNumber}
                  </Badge>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-xs shrink-0",
                      version.changeType === 'create' && "bg-green-500/10 text-green-600",
                      version.changeType === 'update' && "bg-blue-500/10 text-blue-600",
                      version.changeType === 'revert' && "bg-orange-500/10 text-orange-600"
                    )}
                  >
                    {CHANGE_TYPE_LABELS[version.changeType]}
                  </Badge>
                  {index === 0 && (
                    <Badge variant="default" className="text-xs shrink-0">
                      Atual
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground truncate">
                    {formatVersionDate(version.createdAt)}
                  </span>
                </div>
                {index > 0 && onRevert && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRevert(version);
                    }}
                    disabled={reverting}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reverter
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Comparison Results */}
      {selectedVersions.length >= 2 ? (
        <div className="space-y-4">
          {/* Summary */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                Resumo: v{selectedVersions[0].versionNumber}
                <ArrowRight className="h-4 w-4" />
                v{selectedVersions[selectedVersions.length - 1].versionNumber}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {selectedVersions.length} versões selecionadas
                </Badge>
                <Badge variant="secondary">
                  {totalChanges?.length || 0} campos alterados
                </Badge>
                <Badge variant="secondary">
                  {changeTimeline.reduce((sum, c) => sum + c.values.length - 1, 0)} alterações totais
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Changes Timeline */}
          <ScrollArea className="h-[280px]">
            <div className="space-y-3 pr-4">
              {changeTimeline.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma alteração entre as versões selecionadas
                </p>
              ) : (
                changeTimeline.map(fieldChange => (
                  <Card key={fieldChange.field} className="overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleFieldExpand(fieldChange.field)}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {fieldChange.values.length} versões
                        </Badge>
                        <span className="font-medium text-sm">{fieldChange.label}</span>
                      </div>
                      {expandedFields.has(fieldChange.field) ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    
                    {expandedFields.has(fieldChange.field) && (
                      <div className="border-t bg-muted/30 p-3 space-y-2">
                        {fieldChange.values.map((v, idx) => (
                          <div key={v.versionNumber} className="flex items-start gap-3">
                            <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
                              v{v.versionNumber}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm break-words",
                                idx === fieldChange.values.length - 1 
                                  ? "text-green-600 font-medium" 
                                  : "text-muted-foreground line-through"
                              )}>
                                {v.value || <em className="text-muted-foreground/50">vazio</em>}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Direct Comparison Table */}
          {totalChanges && totalChanges.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Comparação Direta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Campo</th>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                          v{selectedVersions[0].versionNumber} (Antiga)
                        </th>
                        <th className="text-left py-2 font-medium text-muted-foreground">
                          v{selectedVersions[selectedVersions.length - 1].versionNumber} (Nova)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {totalChanges.map(diff => (
                        <tr key={diff.field} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{diff.label}</td>
                          <td className="py-2 pr-4 text-muted-foreground line-through">
                            {diff.oldValue || <em className="text-muted-foreground/50">vazio</em>}
                          </td>
                          <td className="py-2 text-green-600">
                            {diff.newValue || <em className="text-muted-foreground/50">vazio</em>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          <GitCompare className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecione pelo menos 2 versões para comparar</p>
        </div>
      )}
    </div>
  );
}
