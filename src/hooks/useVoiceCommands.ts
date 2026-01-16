import { useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDashboardMetrics } from './useDashboardMetrics';
import { useAnswersStore } from '@/lib/stores';
import { toast } from 'sonner';
import { downloadHtmlReport } from '@/lib/htmlReportExport';
import { exportAnswersToXLSX, downloadXLSX } from '@/lib/xlsxExport';

export interface VoiceCommand {
  id: string;
  patterns: RegExp[];
  action: () => void | Promise<void>;
  description: string;
  category: 'navigation' | 'data' | 'ui' | 'domain';
}

export interface CommandResult {
  matched: boolean;
  commandId?: string;
  description?: string;
}

export function useVoiceCommands() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { criticalGaps, metrics, currentDomainInfo, enabledFrameworks, selectedFrameworkIds, frameworkCoverage, roadmap, answers } = useDashboardMetrics();
  const setSelectedSecurityDomain = useAnswersStore(state => state.setSelectedSecurityDomain);

  // Generate summary text for the current security posture
  const generatePostureSummary = useCallback(() => {
    const domain = currentDomainInfo?.domainName || 'Segurança';
    const score = metrics.overallScore.toFixed(1);
    const level = metrics.maturityLevel;
    const coverage = (metrics.coverage * 100).toFixed(0);
    const gaps = metrics.criticalGaps;
    
    return `**Resumo da Postura de ${domain}:**\n\n` +
      `- **Score Geral:** ${score}%\n` +
      `- **Nível de Maturidade:** ${level}\n` +
      `- **Cobertura:** ${coverage}%\n` +
      `- **Gaps Críticos:** ${gaps}\n\n` +
      `${metrics.domainMetrics.slice(0, 5).map(d => 
        `- ${d.domainName}: ${d.score.toFixed(0)}% (${d.criticalGaps} gaps)`
      ).join('\n')}`;
  }, [metrics, currentDomainInfo]);

  // Generate critical gaps text
  const generateGapsReport = useCallback(() => {
    if (criticalGaps.length === 0) {
      return 'Não há gaps críticos identificados no momento. Excelente trabalho!';
    }

    const topGaps = criticalGaps.slice(0, 10);
    return `**Top ${topGaps.length} Gaps Críticos:**\n\n` +
      topGaps.map((g, i) => 
        `${i + 1}. **[${g.domainName}]** ${g.questionText}\n   - Criticidade: ${g.criticality} | Resposta: ${g.response}`
      ).join('\n\n');
  }, [criticalGaps]);

  // Get current dashboard type from location
  const getCurrentDashboardType = useCallback((): 'executive' | 'grc' | 'specialist' | null => {
    if (location.pathname.includes('/dashboard/executive')) return 'executive';
    if (location.pathname.includes('/dashboard/grc')) return 'grc';
    if (location.pathname.includes('/dashboard/specialist')) return 'specialist';
    return null;
  }, [location.pathname]);

  // Export HTML report
  const handleExportHtmlReport = useCallback((): void => {
    const dashboardType = getCurrentDashboardType();
    if (!dashboardType) {
      toast.error(t('voiceCommands.notOnDashboard', 'Navegue para um dashboard primeiro'));
      return;
    }

    const selectedFws = selectedFrameworkIds.length > 0 
      ? enabledFrameworks.filter(f => selectedFrameworkIds.includes(f.frameworkId))
      : enabledFrameworks;

    try {
      downloadHtmlReport({
        dashboardType,
        metrics,
        criticalGaps,
        frameworkCoverage,
        selectedFrameworks: selectedFws,
        roadmap,
        generatedAt: new Date(),
      });
      toast.success(t('voiceCommands.htmlExported', 'Relatório HTML exportado com sucesso'));
    } catch (error) {
      toast.error(t('voiceCommands.exportError', 'Erro ao exportar relatório'));
      console.error('Export error:', error);
    }
  }, [getCurrentDashboardType, selectedFrameworkIds, enabledFrameworks, metrics, criticalGaps, frameworkCoverage, roadmap, t]);

  // Export Excel report
  const handleExportExcelReport = useCallback(async (): Promise<void> => {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const domainName = currentDomainInfo?.shortName || 'assessment';
      const filename = `avaliacao-${domainName.toLowerCase().replace(/\s+/g, '-')}-${dateStr}.xlsx`;
      
      const blob = await exportAnswersToXLSX(answers);
      downloadXLSX(blob, filename);
      toast.success(t('voiceCommands.excelExported', 'Relatório Excel exportado com sucesso'));
    } catch (error) {
      toast.error(t('voiceCommands.exportError', 'Erro ao exportar relatório'));
      console.error('Export error:', error);
    }
  }, [answers, currentDomainInfo, t]);

  // Define commands
  const commands: VoiceCommand[] = useMemo(() => [
    // Navigation commands
    {
      id: 'nav_home',
      patterns: [
        /ir\s*(para)?\s*(a)?\s*home/i,
        /go\s*(to)?\s*home/i,
        /abrir\s*(a)?\s*home/i,
        /página\s*inicial/i,
      ],
      action: () => navigate('/'),
      description: t('voiceCommands.goToHome', 'Ir para Home'),
      category: 'navigation',
    },
    {
      id: 'nav_dashboard',
      patterns: [
        /ir\s*(para)?\s*(o)?\s*dashboard/i,
        /go\s*(to)?\s*dashboard/i,
        /abrir\s*(o)?\s*dashboard/i,
        /mostrar\s*(o)?\s*dashboard/i,
        /ver\s*(o)?\s*dashboard/i,
      ],
      action: () => navigate('/dashboard/executive'),
      description: t('voiceCommands.goToDashboard', 'Ir para Dashboard'),
      category: 'navigation',
    },
    {
      id: 'nav_dashboard_grc',
      patterns: [
        /dashboard\s*(de)?\s*grc/i,
        /ir\s*(para)?\s*(o)?\s*grc/i,
        /abrir\s*(o)?\s*grc/i,
      ],
      action: () => navigate('/dashboard/grc'),
      description: t('voiceCommands.goToGRC', 'Ir para Dashboard GRC'),
      category: 'navigation',
    },
    {
      id: 'nav_dashboard_specialist',
      patterns: [
        /dashboard\s*(de)?\s*especialista/i,
        /ir\s*(para)?\s*(o)?\s*especialista/i,
        /dashboard\s*técnico/i,
        /specialist\s*dashboard/i,
      ],
      action: () => navigate('/dashboard/specialist'),
      description: t('voiceCommands.goToSpecialist', 'Ir para Dashboard Especialista'),
      category: 'navigation',
    },
    {
      id: 'nav_assessment',
      patterns: [
        /ir\s*(para)?\s*(a)?\s*avaliação/i,
        /go\s*(to)?\s*assessment/i,
        /abrir\s*(a)?\s*avaliação/i,
        /mostrar\s*(a)?\s*avaliação/i,
        /assessment/i,
      ],
      action: () => navigate('/assessment'),
      description: t('voiceCommands.goToAssessment', 'Ir para Avaliação'),
      category: 'navigation',
    },
    {
      id: 'nav_settings',
      patterns: [
        /ir\s*(para)?\s*(as)?\s*configurações/i,
        /go\s*(to)?\s*settings/i,
        /abrir\s*(as)?\s*configurações/i,
        /settings/i,
        /configurar/i,
      ],
      action: () => navigate('/settings'),
      description: t('voiceCommands.goToSettings', 'Ir para Configurações'),
      category: 'navigation',
    },
    {
      id: 'nav_profile',
      patterns: [
        /ir\s*(para)?\s*(o)?\s*perfil/i,
        /go\s*(to)?\s*profile/i,
        /abrir\s*(o)?\s*perfil/i,
        /meu\s*perfil/i,
        /my\s*profile/i,
      ],
      action: () => navigate('/profile'),
      description: t('voiceCommands.goToProfile', 'Ir para Perfil'),
      category: 'navigation',
    },
    // Domain switching commands
    {
      id: 'domain_ai',
      patterns: [
        /mudar\s*(para)?\s*(o)?\s*domínio\s*(de)?\s*i\.?a\.?/i,
        /trocar\s*(para)?\s*(o)?\s*domínio\s*(de)?\s*i\.?a\.?/i,
        /domínio\s*(de)?\s*i\.?a\.?\s*security/i,
        /ai\s*security/i,
        /segurança\s*(de)?\s*i\.?a\.?/i,
        /inteligência\s*artificial/i,
        /switch\s*(to)?\s*ai\s*security/i,
        /change\s*(to)?\s*ai\s*(domain)?/i,
      ],
      action: async () => {
        await setSelectedSecurityDomain('ai-security');
        toast.success(t('voiceCommands.domainChanged', 'Domínio alterado para AI Security'));
      },
      description: t('voiceCommands.switchToAI', 'Mudar para AI Security'),
      category: 'domain',
    },
    {
      id: 'domain_cloud',
      patterns: [
        /mudar\s*(para)?\s*(o)?\s*domínio\s*(de)?\s*cloud/i,
        /trocar\s*(para)?\s*(o)?\s*domínio\s*(de)?\s*cloud/i,
        /domínio\s*(de)?\s*cloud\s*security/i,
        /cloud\s*security/i,
        /segurança\s*(de)?\s*cloud/i,
        /segurança\s*(de)?\s*nuvem/i,
        /switch\s*(to)?\s*cloud\s*security/i,
        /change\s*(to)?\s*cloud\s*(domain)?/i,
      ],
      action: async () => {
        await setSelectedSecurityDomain('cloud-security');
        toast.success(t('voiceCommands.domainChanged', 'Domínio alterado para Cloud Security'));
      },
      description: t('voiceCommands.switchToCloud', 'Mudar para Cloud Security'),
      category: 'domain',
    },
    {
      id: 'domain_devsecops',
      patterns: [
        /mudar\s*(para)?\s*(o)?\s*domínio\s*(de)?\s*devsecops/i,
        /trocar\s*(para)?\s*(o)?\s*domínio\s*(de)?\s*devsecops/i,
        /domínio\s*(de)?\s*devsecops/i,
        /devsecops/i,
        /dev\s*sec\s*ops/i,
        /segurança\s*(de)?\s*desenvolvimento/i,
        /switch\s*(to)?\s*devsecops/i,
        /change\s*(to)?\s*devsecops\s*(domain)?/i,
      ],
      action: async () => {
        await setSelectedSecurityDomain('devsecops');
        toast.success(t('voiceCommands.domainChanged', 'Domínio alterado para DevSecOps'));
      },
      description: t('voiceCommands.switchToDevSecOps', 'Mudar para DevSecOps'),
      category: 'domain',
    },
    // Export commands
    {
      id: 'export_html',
      patterns: [
        /exportar\s*(relatório)?\s*html/i,
        /gerar\s*(relatório)?\s*html/i,
        /baixar\s*(relatório)?\s*html/i,
        /export\s*(report)?\s*html/i,
        /download\s*html\s*(report)?/i,
        /relatório\s*html/i,
        /html\s*report/i,
      ],
      action: () => handleExportHtmlReport(),
      description: t('voiceCommands.exportHtml', 'Exportar Relatório HTML'),
      category: 'ui',
    },
    {
      id: 'export_excel',
      patterns: [
        /exportar\s*(relatório)?\s*(para)?\s*excel/i,
        /exportar\s*(relatório)?\s*(para)?\s*xlsx/i,
        /gerar\s*(relatório)?\s*excel/i,
        /baixar\s*(relatório)?\s*excel/i,
        /export\s*(report)?\s*(to)?\s*excel/i,
        /download\s*excel\s*(report)?/i,
        /relatório\s*excel/i,
        /excel\s*report/i,
        /planilha/i,
        /spreadsheet/i,
      ],
      action: async () => await handleExportExcelReport(),
      description: t('voiceCommands.exportExcel', 'Exportar Relatório Excel'),
      category: 'ui',
    },
  ], [navigate, t, setSelectedSecurityDomain, handleExportHtmlReport, handleExportExcelReport]);

  // Data commands that return text instead of navigating
  const dataCommands = useMemo(() => [
    {
      id: 'data_gaps',
      patterns: [
        /mostrar\s*(os)?\s*gaps\s*(críticos)?/i,
        /show\s*(critical)?\s*gaps/i,
        /quais\s*(são)?\s*(os)?\s*gaps/i,
        /listar\s*(os)?\s*gaps/i,
        /gaps\s*críticos/i,
        /critical\s*gaps/i,
      ],
      getData: generateGapsReport,
      description: t('voiceCommands.showGaps', 'Mostrar Gaps Críticos'),
      category: 'data' as const,
    },
    {
      id: 'data_summary',
      patterns: [
        /resumo\s*(da)?\s*(postura)?/i,
        /resumir\s*(a)?\s*postura/i,
        /summary/i,
        /postura\s*(de)?\s*segurança/i,
        /security\s*posture/i,
        /como\s*estou/i,
        /how\s*am\s*i\s*doing/i,
        /minha\s*situação/i,
      ],
      getData: generatePostureSummary,
      description: t('voiceCommands.showSummary', 'Resumir Postura de Segurança'),
      category: 'data' as const,
    },
    {
      id: 'data_score',
      patterns: [
        /qual\s*(é)?\s*(o)?\s*(meu)?\s*score/i,
        /what\s*(is)?\s*(my)?\s*score/i,
        /minha\s*pontuação/i,
        /my\s*score/i,
      ],
      getData: () => `Seu score atual é **${metrics.overallScore.toFixed(1)}%** com nível de maturidade **${metrics.maturityLevel}**.`,
      description: t('voiceCommands.showScore', 'Mostrar Score'),
      category: 'data' as const,
    },
    {
      id: 'data_maturity',
      patterns: [
        /nível\s*(de)?\s*maturidade/i,
        /maturity\s*level/i,
        /qual\s*(é)?\s*(o)?\s*nível/i,
      ],
      getData: () => `Seu nível de maturidade atual é **${metrics.maturityLevel}** (${metrics.overallScore.toFixed(1)}% de score geral).`,
      description: t('voiceCommands.showMaturity', 'Mostrar Nível de Maturidade'),
      category: 'data' as const,
    },
    {
      id: 'data_coverage',
      patterns: [
        /cobertura/i,
        /coverage/i,
        /quanto\s*(está)?\s*respondido/i,
        /progresso/i,
        /progress/i,
      ],
      getData: () => `Cobertura da avaliação: **${(metrics.coverage * 100).toFixed(0)}%** (${metrics.answeredQuestions} de ${metrics.totalQuestions} perguntas respondidas).`,
      description: t('voiceCommands.showCoverage', 'Mostrar Cobertura'),
      category: 'data' as const,
    },
  ], [generateGapsReport, generatePostureSummary, metrics, t]);

  // Execute navigation command
  const executeCommand = useCallback((text: string): CommandResult => {
    const normalizedText = text.toLowerCase().trim();
    
    for (const command of commands) {
      for (const pattern of command.patterns) {
        if (pattern.test(normalizedText)) {
          command.action();
          return {
            matched: true,
            commandId: command.id,
            description: command.description,
          };
        }
      }
    }
    
    return { matched: false };
  }, [commands]);

  // Check for data command and return data
  const getDataFromCommand = useCallback((text: string): { matched: boolean; data?: string; description?: string } => {
    const normalizedText = text.toLowerCase().trim();
    
    for (const command of dataCommands) {
      for (const pattern of command.patterns) {
        if (pattern.test(normalizedText)) {
          return {
            matched: true,
            data: command.getData(),
            description: command.description,
          };
        }
      }
    }
    
    return { matched: false };
  }, [dataCommands]);

  // Check if text is a command (navigation or data)
  const isCommand = useCallback((text: string): boolean => {
    const normalizedText = text.toLowerCase().trim();
    
    const allPatterns = [
      ...commands.flatMap(c => c.patterns),
      ...dataCommands.flatMap(c => c.patterns),
    ];
    
    return allPatterns.some(pattern => pattern.test(normalizedText));
  }, [commands, dataCommands]);

  // Get all available commands for help
  const getAllCommands = useCallback(() => {
    return [
      ...commands.map(c => ({ id: c.id, description: c.description, category: c.category })),
      ...dataCommands.map(c => ({ id: c.id, description: c.description, category: c.category })),
    ];
  }, [commands, dataCommands]);

  return {
    executeCommand,
    getDataFromCommand,
    isCommand,
    getAllCommands,
    commands,
    dataCommands,
  };
}
