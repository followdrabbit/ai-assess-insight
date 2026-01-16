import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDashboardMetrics } from './useDashboardMetrics';

export interface VoiceCommand {
  id: string;
  patterns: RegExp[];
  action: () => void | Promise<void>;
  description: string;
  category: 'navigation' | 'data' | 'ui';
}

export interface CommandResult {
  matched: boolean;
  commandId?: string;
  description?: string;
}

export function useVoiceCommands() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { criticalGaps, metrics, currentDomainInfo } = useDashboardMetrics();

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
  ], [navigate, t]);

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
