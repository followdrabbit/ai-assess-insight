import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Plus, Trash2, Star, StarOff, Settings2, TestTube, Loader2, Eye, EyeOff, Check, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AIProvidersSkeleton } from '@/components/settings/AnimatedSkeleton';
import { useAIProviders, AIProvider, PROVIDER_TEMPLATES, ProviderTemplate } from '@/hooks/useAIProviders';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function AIProvidersPanel() {
  const { t } = useTranslation();
  const { providers, defaultProvider, isLoading, saveProvider, deleteProvider, setAsDefault, testConnection, templates } = useAIProviders();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Partial<AIProvider> | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ProviderTemplate | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddNew = (template: ProviderTemplate) => {
    setSelectedTemplate(template);
    setEditingProvider({
      providerType: template.type,
      name: template.name,
      endpointUrl: template.defaultEndpoint,
      modelId: template.models[0]?.id,
      maxTokens: 4096,
      temperature: 0.7,
      isEnabled: true,
      isDefault: false,
    });
    setApiKey('');
    setIsDialogOpen(true);
  };

  const handleEdit = (provider: AIProvider) => {
    const template = templates.find(t => t.type === provider.providerType);
    setSelectedTemplate(template || null);
    setEditingProvider({ ...provider });
    setApiKey('');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingProvider?.name) {
      toast.error('Nome é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      const success = await saveProvider({
        ...editingProvider,
        apiKey: apiKey || undefined,
      });

      if (success) {
        toast.success(editingProvider.id ? 'Provedor atualizado' : 'Provedor adicionado');
        setIsDialogOpen(false);
        setEditingProvider(null);
        setApiKey('');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!editingProvider) return;

    setIsTesting(true);
    try {
      const result = await testConnection({
        ...editingProvider,
        apiKey: apiKey || undefined,
      });
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteProvider(id);
    if (success) {
      toast.success('Provedor removido');
    }
  };

  const handleSetDefault = async (id: string) => {
    await setAsDefault(id);
  };

  if (isLoading) {
    return <AIProvidersSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle>{t('aiProviders.title', 'Provedores de IA')}</CardTitle>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t('aiProviders.addProvider', 'Adicionar Provedor')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('aiProviders.selectProvider', 'Selecionar Provedor')}</DialogTitle>
                <DialogDescription>
                  {t('aiProviders.selectProviderDesc', 'Escolha um provedor de IA para configurar')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-4">
                {templates.map(template => (
                  <button
                    key={template.type}
                    onClick={() => handleAddNew(template)}
                    className={cn(
                      "p-4 rounded-lg border text-left transition-all hover:border-primary hover:bg-primary/5",
                      "flex flex-col gap-2"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{template.icon}</span>
                      <span className="font-medium">{template.name}</span>
                      {template.isLocal && (
                        <Badge variant="outline" className="text-xs">Local</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                    {template.requiresApiKey && (
                      <Badge variant="secondary" className="text-xs w-fit">Requer API Key</Badge>
                    )}
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          {t('aiProviders.description', 'Configure diferentes provedores de IA para o assistente')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {providers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>{t('aiProviders.noProviders', 'Nenhum provedor configurado')}</p>
          </div>
        ) : (
          providers.map(provider => {
            const template = templates.find(t => t.type === provider.providerType);
            return (
              <div
                key={provider.id}
                className={cn(
                  "p-4 rounded-lg border transition-all",
                  provider.isDefault && "border-primary bg-primary/5",
                  !provider.isEnabled && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{template?.icon || '🤖'}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{provider.name}</h3>
                        {provider.isDefault && (
                          <Badge variant="default" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Padrão
                          </Badge>
                        )}
                        {!provider.isEnabled && (
                          <Badge variant="secondary" className="text-xs">Desativado</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {template?.name} • {provider.modelId || 'Modelo não definido'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!provider.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSetDefault(provider.id)}
                        title="Definir como padrão"
                      >
                        <StarOff className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(provider)}
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    {!provider.isDefault && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Provedor</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir "{provider.name}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(provider.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Temp: {provider.temperature}</span>
                  <span>•</span>
                  <span>Max Tokens: {provider.maxTokens}</span>
                  {provider.endpointUrl && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-[200px]">{provider.endpointUrl}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{selectedTemplate?.icon}</span>
              {editingProvider?.id ? 'Editar Provedor' : `Configurar ${selectedTemplate?.name}`}
            </DialogTitle>
          </DialogHeader>

          {editingProvider && (
            <Tabs defaultValue="basic" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="advanced">Avançado</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={editingProvider.name || ''}
                    onChange={e => setEditingProvider({ ...editingProvider, name: e.target.value })}
                    placeholder="Meu provedor"
                  />
                </div>

                {selectedTemplate && selectedTemplate.models.length > 0 && (
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Select
                      value={editingProvider.modelId || ''}
                      onValueChange={value => setEditingProvider({ ...editingProvider, modelId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedTemplate.models.map(model => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex flex-col">
                              <span>{model.name}</span>
                              {model.description && (
                                <span className="text-xs text-muted-foreground">{model.description}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {editingProvider.providerType === 'custom' && (
                  <div className="space-y-2">
                    <Label>ID do Modelo</Label>
                    <Input
                      value={editingProvider.modelId || ''}
                      onChange={e => setEditingProvider({ ...editingProvider, modelId: e.target.value })}
                      placeholder="gpt-4, claude-3, etc."
                    />
                  </div>
                )}

                {selectedTemplate?.requiresApiKey && (
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <div className="relative">
                      <Input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder={editingProvider.id ? '••••••••••••' : 'sk-...'}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-7 w-7"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {editingProvider.id && (
                      <p className="text-xs text-muted-foreground">
                        Deixe em branco para manter a chave atual
                      </p>
                    )}
                  </div>
                )}

                {(selectedTemplate?.isLocal || editingProvider.providerType === 'custom') && (
                  <div className="space-y-2">
                    <Label>URL do Endpoint</Label>
                    <Input
                      value={editingProvider.endpointUrl || ''}
                      onChange={e => setEditingProvider({ ...editingProvider, endpointUrl: e.target.value })}
                      placeholder={selectedTemplate?.defaultEndpoint || 'https://...'}
                    />
                    {selectedTemplate?.isLocal && (
                      <p className="text-xs text-muted-foreground">
                        Certifique-se de que o Ollama está rodando localmente
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label>Ativado</Label>
                  <Switch
                    checked={editingProvider.isEnabled ?? true}
                    onCheckedChange={checked => setEditingProvider({ ...editingProvider, isEnabled: checked })}
                  />
                </div>

                {!editingProvider.id && (
                  <div className="flex items-center justify-between">
                    <Label>Definir como padrão</Label>
                    <Switch
                      checked={editingProvider.isDefault ?? false}
                      onCheckedChange={checked => setEditingProvider({ ...editingProvider, isDefault: checked })}
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Temperatura: {editingProvider.temperature?.toFixed(2)}</Label>
                  </div>
                  <Slider
                    value={[editingProvider.temperature ?? 0.7]}
                    onValueChange={([value]) => setEditingProvider({ ...editingProvider, temperature: value })}
                    min={0}
                    max={2}
                    step={0.05}
                  />
                  <p className="text-xs text-muted-foreground">
                    Valores mais baixos = respostas mais focadas. Mais altos = mais criativas.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input
                    type="number"
                    value={editingProvider.maxTokens ?? 4096}
                    onChange={e => setEditingProvider({ ...editingProvider, maxTokens: parseInt(e.target.value) || 4096 })}
                    min={256}
                    max={128000}
                  />
                </div>

                <div className="space-y-2">
                  <Label>System Prompt Personalizado</Label>
                  <Textarea
                    value={editingProvider.systemPrompt || ''}
                    onChange={e => setEditingProvider({ ...editingProvider, systemPrompt: e.target.value })}
                    placeholder="Instruções personalizadas para o modelo..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe vazio para usar o prompt padrão de segurança
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={isTesting}
            >
              {isTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
              Testar Conexão
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
