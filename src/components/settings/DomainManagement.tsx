import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SecurityDomain, getAllSecurityDomains, DOMAIN_COLORS } from '@/lib/securityDomains';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Brain, Cloud, Code, Shield, Lock, Database, Server, Key, Pencil, GripVertical, Save } from 'lucide-react';
import { questions } from '@/lib/dataset';
import { frameworks } from '@/lib/frameworks';

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  brain: Brain,
  cloud: Cloud,
  code: Code,
  shield: Shield,
  lock: Lock,
  database: Database,
  server: Server,
  key: Key
};

const COLOR_OPTIONS = [
  { value: 'purple', label: 'Roxo' },
  { value: 'blue', label: 'Azul' },
  { value: 'green', label: 'Verde' },
  { value: 'orange', label: 'Laranja' },
  { value: 'red', label: 'Vermelho' },
  { value: 'yellow', label: 'Amarelo' }
];

const ICON_OPTIONS = [
  { value: 'brain', label: 'Cérebro (IA)' },
  { value: 'cloud', label: 'Nuvem' },
  { value: 'code', label: 'Código' },
  { value: 'shield', label: 'Escudo' },
  { value: 'lock', label: 'Cadeado' },
  { value: 'database', label: 'Banco de Dados' },
  { value: 'server', label: 'Servidor' },
  { value: 'key', label: 'Chave' }
];

export function DomainManagement() {
  const [domains, setDomains] = useState<SecurityDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingDomain, setEditingDomain] = useState<SecurityDomain | null>(null);
  const [editFormData, setEditFormData] = useState({
    domainName: '',
    shortName: '',
    description: '',
    color: 'blue',
    icon: 'shield'
  });

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    setLoading(true);
    try {
      const data = await getAllSecurityDomains();
      setDomains(data);
    } catch (error) {
      console.error('Error loading domains:', error);
      toast.error('Erro ao carregar domínios');
    } finally {
      setLoading(false);
    }
  };

  const getQuestionCount = (domainId: string): number => {
    return questions.filter(q => q.securityDomainId === domainId).length;
  };

  const getFrameworkCount = (domainId: string): number => {
    return frameworks.filter(f => f.securityDomainId === domainId).length;
  };

  const toggleDomainEnabled = async (domain: SecurityDomain) => {
    // Prevent disabling if it's the last enabled domain
    const enabledCount = domains.filter(d => d.isEnabled).length;
    if (domain.isEnabled && enabledCount <= 1) {
      toast.error('Pelo menos um domínio deve estar habilitado');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('security_domains')
        .update({ is_enabled: !domain.isEnabled, updated_at: new Date().toISOString() })
        .eq('domain_id', domain.domainId);

      if (error) throw error;

      setDomains(prev => prev.map(d => 
        d.domainId === domain.domainId 
          ? { ...d, isEnabled: !d.isEnabled }
          : d
      ));

      toast.success(`Domínio ${!domain.isEnabled ? 'habilitado' : 'desabilitado'}`);
    } catch (error) {
      console.error('Error toggling domain:', error);
      toast.error('Erro ao atualizar domínio');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (domain: SecurityDomain) => {
    setEditingDomain(domain);
    setEditFormData({
      domainName: domain.domainName,
      shortName: domain.shortName,
      description: domain.description,
      color: domain.color,
      icon: domain.icon
    });
  };

  const saveEditedDomain = async () => {
    if (!editingDomain) return;

    if (!editFormData.domainName.trim() || !editFormData.shortName.trim()) {
      toast.error('Nome e nome curto são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('security_domains')
        .update({
          domain_name: editFormData.domainName.trim(),
          short_name: editFormData.shortName.trim(),
          description: editFormData.description.trim(),
          color: editFormData.color,
          icon: editFormData.icon,
          updated_at: new Date().toISOString()
        })
        .eq('domain_id', editingDomain.domainId);

      if (error) throw error;

      setDomains(prev => prev.map(d => 
        d.domainId === editingDomain.domainId 
          ? { 
              ...d, 
              domainName: editFormData.domainName.trim(),
              shortName: editFormData.shortName.trim(),
              description: editFormData.description.trim(),
              color: editFormData.color,
              icon: editFormData.icon
            }
          : d
      ));

      setEditingDomain(null);
      toast.success('Domínio atualizado com sucesso');
    } catch (error) {
      console.error('Error saving domain:', error);
      toast.error('Erro ao salvar domínio');
    } finally {
      setSaving(false);
    }
  };

  const DomainCard = ({ domain }: { domain: SecurityDomain }) => {
    const IconComponent = ICON_COMPONENTS[domain.icon] || Shield;
    const colorStyles = DOMAIN_COLORS[domain.color] || DOMAIN_COLORS.blue;
    const questionCount = getQuestionCount(domain.domainId);
    const frameworkCount = getFrameworkCount(domain.domainId);

    return (
      <Card className={cn(
        "transition-all",
        domain.isEnabled 
          ? "border-primary/50" 
          : "opacity-60 border-muted"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2.5 rounded-lg",
                colorStyles.bg
              )}>
                <IconComponent className={cn("h-5 w-5", colorStyles.text)} />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {domain.domainName}
                  {!domain.isEnabled && (
                    <Badge variant="secondary" className="text-xs">
                      Desabilitado
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {domain.shortName} • Ordem: {domain.displayOrder}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => openEditDialog(domain)}
                className="h-8 w-8"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Switch
                checked={domain.isEnabled}
                onCheckedChange={() => toggleDomainEnabled(domain)}
                disabled={saving}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {domain.description || 'Sem descrição'}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={cn("font-normal", colorStyles.border)}>
                {frameworkCount} frameworks
              </Badge>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="font-normal">
                {questionCount} perguntas
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Domínios de Segurança</CardTitle>
          <CardDescription>
            Gerencie os domínios de governança de segurança disponíveis na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 mb-6">
            <div>
              <div className="text-2xl font-bold">{domains.length}</div>
              <div className="text-sm text-muted-foreground">Domínios totais</div>
            </div>
            <div className="border-l border-border pl-6">
              <div className="text-2xl font-bold">{domains.filter(d => d.isEnabled).length}</div>
              <div className="text-sm text-muted-foreground">Domínios ativos</div>
            </div>
            <div className="border-l border-border pl-6">
              <div className="text-2xl font-bold">{questions.length}</div>
              <div className="text-sm text-muted-foreground">Perguntas totais</div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {domains.map(domain => (
              <DomainCard key={domain.domainId} domain={domain} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2">Sobre os Domínios de Segurança</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Cada domínio representa uma área principal de governança de segurança</li>
            <li>• Frameworks e perguntas são associados a domínios específicos</li>
            <li>• Desabilitar um domínio oculta seus dados dos dashboards</li>
            <li>• Pelo menos um domínio deve estar sempre habilitado</li>
            <li>• Domínios personalizados podem ser adicionados futuramente</li>
          </ul>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingDomain} onOpenChange={(open) => !open && setEditingDomain(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Domínio</DialogTitle>
            <DialogDescription>
              Personalize as informações de exibição do domínio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="domainName">Nome do Domínio</Label>
              <Input
                id="domainName"
                value={editFormData.domainName}
                onChange={(e) => setEditFormData(prev => ({ ...prev, domainName: e.target.value }))}
                placeholder="Ex: AI Security"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortName">Nome Curto</Label>
              <Input
                id="shortName"
                value={editFormData.shortName}
                onChange={(e) => setEditFormData(prev => ({ ...prev, shortName: e.target.value }))}
                placeholder="Ex: AI Sec"
                maxLength={15}
              />
              <p className="text-xs text-muted-foreground">Usado em badges e espaços compactos</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={editFormData.description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do domínio de segurança..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cor</Label>
                <Select
                  value={editFormData.color}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, color: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map(option => {
                      const colorStyle = DOMAIN_COLORS[option.value];
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-3 h-3 rounded-full", colorStyle?.bg)} />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ícone</Label>
                <Select
                  value={editFormData.icon}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, icon: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(option => {
                      const IconComp = ICON_COMPONENTS[option.value];
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            {IconComp && <IconComp className="h-4 w-4" />}
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2 pt-2">
              <Label>Visualização</Label>
              <div className={cn(
                "p-3 rounded-lg border flex items-center gap-3",
                DOMAIN_COLORS[editFormData.color]?.bg || 'bg-muted'
              )}>
                {(() => {
                  const IconComp = ICON_COMPONENTS[editFormData.icon] || Shield;
                  const textColor = DOMAIN_COLORS[editFormData.color]?.text || 'text-foreground';
                  return <IconComp className={cn("h-5 w-5", textColor)} />;
                })()}
                <div>
                  <div className={cn("font-medium text-sm", DOMAIN_COLORS[editFormData.color]?.text)}>
                    {editFormData.domainName || 'Nome do Domínio'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {editFormData.shortName || 'Nome Curto'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDomain(null)}>
              Cancelar
            </Button>
            <Button onClick={saveEditedDomain} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
