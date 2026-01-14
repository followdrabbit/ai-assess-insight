import { useState, useRef, useEffect } from 'react';
import { useAnswersStore } from '@/lib/stores';
import { 
  createBackup, 
  getAllBackups, 
  deleteBackup, 
  downloadBackupAsJSON,
  validateBackupFile,
  restoreFromBackup,
  resetAnswersOnly,
  resetAnswersAndDashboards,
  factoryReset,
  getSettings,
  updateSettings,
  formatBytes,
  formatDate,
  BackupRecord,
  PlatformSettings,
} from '@/lib/settingsDatabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function DataManagementSection() {
  const { loadAnswers, answers } = useAnswersStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backupName, setBackupName] = useState('');
  const [backupDescription, setBackupDescription] = useState('');
  
  // Dialogs
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState<'answers' | 'dashboards' | 'factory' | null>(null);
  const [showDeleteBackupDialog, setShowDeleteBackupDialog] = useState<number | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{ data: any; warnings: string[] } | null>(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [backupList, platformSettings] = await Promise.all([
        getAllBackups(),
        getSettings(),
      ]);
      setBackups(backupList);
      setSettings(platformSettings);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateBackup = async () => {
    const name = backupName.trim() || `Backup ${new Date().toLocaleDateString('pt-BR')}`;
    try {
      await createBackup(name, backupDescription, 'manual');
      await loadData();
      setBackupName('');
      setBackupDescription('');
      toast.success('Backup criado com sucesso');
    } catch (error) {
      toast.error('Erro ao criar backup');
    }
  };
  
  const handleDownloadBackup = (backup: BackupRecord) => {
    downloadBackupAsJSON(backup);
    toast.success('Download iniciado');
  };
  
  const handleDeleteBackup = async (id: number) => {
    try {
      await deleteBackup(id);
      await loadData();
      setShowDeleteBackupDialog(null);
      toast.success('Backup excluído');
    } catch (error) {
      toast.error('Erro ao excluir backup');
    }
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const result = await validateBackupFile(file);
    
    if (!result.isValid) {
      toast.error('Arquivo inválido: ' + result.errors.join(', '));
      return;
    }
    
    setPendingRestore({ data: result.data, warnings: result.warnings });
    setShowRestoreDialog(true);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleRestore = async () => {
    if (!pendingRestore?.data) return;
    
    try {
      await restoreFromBackup(pendingRestore.data);
      await loadAnswers();
      await loadData();
      setShowRestoreDialog(false);
      setPendingRestore(null);
      toast.success('Restauração concluída com sucesso');
    } catch (error) {
      toast.error('Erro ao restaurar backup');
    }
  };
  
  const handleReset = async (type: 'answers' | 'dashboards' | 'factory') => {
    try {
      if (type === 'answers') {
        await resetAnswersOnly();
      } else if (type === 'dashboards') {
        await resetAnswersAndDashboards();
      } else {
        await factoryReset();
      }
      await loadAnswers();
      await loadData();
      setShowResetDialog(null);
      toast.success('Reset realizado com sucesso');
    } catch (error) {
      toast.error('Erro ao realizar reset');
    }
  };
  
  const handleSettingsChange = async (key: keyof PlatformSettings, value: any) => {
    if (!settings) return;
    
    const updates = { [key]: value };
    await updateSettings(updates);
    setSettings({ ...settings, ...updates });
    toast.success('Configuração salva');
  };
  
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Manual Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backup Manual</CardTitle>
          <CardDescription>
            Exporte todos os dados (frameworks, perguntas, respostas, configurações) para um arquivo JSON
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome do Backup</Label>
              <Input 
                placeholder="Ex: Backup pré-auditoria"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input 
                placeholder="Notas sobre este backup"
                value={backupDescription}
                onChange={(e) => setBackupDescription(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {answers.size} respostas serão incluídas no backup
            </div>
            <Button onClick={handleCreateBackup}>
              Criar Backup
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Scheduled Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backup Agendado</CardTitle>
          <CardDescription>
            Configure backups automáticos. Os backups são armazenados localmente no navegador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Ativar backup agendado</div>
              <div className="text-sm text-muted-foreground">
                Backups automáticos serão criados periodicamente
              </div>
            </div>
            <Switch
              checked={settings?.scheduledBackupEnabled || false}
              onCheckedChange={(checked) => handleSettingsChange('scheduledBackupEnabled', checked)}
            />
          </div>
          
          {settings?.scheduledBackupEnabled && (
            <>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={settings.backupFrequency}
                    onValueChange={(v) => handleSettingsChange('backupFrequency', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Retenção (quantidade)</Label>
                  <Select
                    value={settings.backupRetention.toString()}
                    onValueChange={(v) => handleSettingsChange('backupRetention', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">Manter últimos 3</SelectItem>
                      <SelectItem value="5">Manter últimos 5</SelectItem>
                      <SelectItem value="10">Manter últimos 10</SelectItem>
                      <SelectItem value="20">Manter últimos 20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {settings.lastScheduledBackup && (
                <div className="text-sm text-muted-foreground">
                  Último backup agendado: {formatDate(settings.lastScheduledBackup)}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Backups</CardTitle>
          <CardDescription>
            {backups.length} backup(s) armazenado(s) localmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum backup encontrado
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div 
                  key={backup.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{backup.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {backup.type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatDate(backup.createdAt)} • {formatBytes(backup.size)} • {backup.answersCount} respostas
                    </div>
                    {backup.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {backup.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadBackup(backup)}
                    >
                      Download
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setShowDeleteBackupDialog(backup.id!)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Restore */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Restaurar Backup</CardTitle>
          <CardDescription>
            Importe um backup previamente exportado. Os dados atuais serão substituídos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Selecione um arquivo JSON de backup para restaurar
            </div>
            <Button 
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Selecionar Arquivo
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="font-medium text-amber-800 dark:text-amber-200">Atenção</div>
            <div className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              A restauração irá substituir todos os dados atuais. Recomendamos criar um backup antes de prosseguir.
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Reset */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Reset de Dados</CardTitle>
          <CardDescription>
            Ações irreversíveis. Crie um backup antes de prosseguir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">Reset de Respostas</div>
              <div className="text-sm text-muted-foreground">
                Remove todas as respostas da avaliação. Frameworks e configurações são preservados.
              </div>
            </div>
            <Button 
              variant="outline" 
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={() => setShowResetDialog('answers')}
            >
              Resetar Respostas
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">Reset de Respostas + Dashboards</div>
              <div className="text-sm text-muted-foreground">
                Remove respostas e limpa dados de dashboards. Configurações são preservadas.
              </div>
            </div>
            <Button 
              variant="outline"
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={() => setShowResetDialog('dashboards')}
            >
              Resetar Tudo
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-3 border border-destructive rounded-lg bg-destructive/5">
            <div>
              <div className="font-medium text-destructive">Factory Reset</div>
              <div className="text-sm text-muted-foreground">
                Remove TODOS os dados e restaura configurações padrão. Esta ação é irreversível.
              </div>
            </div>
            <Button 
              variant="destructive"
              onClick={() => setShowResetDialog('factory')}
            >
              Factory Reset
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Restore Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Restauração</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você está prestes a restaurar um backup. Esta ação irá:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Substituir todas as respostas atuais</li>
                <li>Substituir todas as configurações</li>
                <li>Substituir frameworks e perguntas customizadas</li>
              </ul>
              {pendingRestore?.warnings.length ? (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded">
                  <div className="font-medium text-amber-800 dark:text-amber-200">Avisos:</div>
                  <ul className="list-disc pl-4 text-amber-700 dark:text-amber-300">
                    {pendingRestore.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              ) : null}
              <p className="font-medium mt-4">Deseja continuar?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Reset Dialog */}
      <AlertDialog open={!!showResetDialog} onOpenChange={() => setShowResetDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              {showResetDialog === 'factory' ? 'Confirmar Factory Reset' : 'Confirmar Reset'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {showResetDialog === 'answers' && (
                <p>Todas as respostas da avaliação serão permanentemente removidas. Esta ação não pode ser desfeita.</p>
              )}
              {showResetDialog === 'dashboards' && (
                <p>Todas as respostas e dados de dashboards serão permanentemente removidos. Configurações serão preservadas.</p>
              )}
              {showResetDialog === 'factory' && (
                <div className="space-y-2">
                  <p className="font-medium text-destructive">ATENÇÃO: Esta é uma ação destrutiva!</p>
                  <p>TODOS os dados serão permanentemente removidos:</p>
                  <ul className="list-disc pl-4">
                    <li>Todas as respostas</li>
                    <li>Todos os backups armazenados</li>
                    <li>Todos os frameworks customizados</li>
                    <li>Todas as perguntas customizadas</li>
                    <li>Todo o histórico de alterações</li>
                    <li>Todas as configurações</li>
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleReset(showResetDialog!)}
            >
              {showResetDialog === 'factory' ? 'Sim, Realizar Factory Reset' : 'Confirmar Reset'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Backup Dialog */}
      <AlertDialog open={!!showDeleteBackupDialog} onOpenChange={() => setShowDeleteBackupDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este backup? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleDeleteBackup(showDeleteBackupDialog!)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
