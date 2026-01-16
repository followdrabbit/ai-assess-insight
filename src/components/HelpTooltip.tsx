import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
  title: string;
  modalTitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function HelpTooltip({ title, modalTitle, children, className }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors",
            className
          )}
        >
          <span className="text-xs underline decoration-dotted cursor-help">{title}</span>
          <span className="text-xs">?</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modalTitle || title}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground space-y-2 pt-2">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Pre-defined help content for common metrics
export function MaturityScoreHelp() {
  return (
    <HelpTooltip title="Como é calculado?" modalTitle="Score de Maturidade">
      <div className="space-y-3">
        <p><strong>Score de Maturidade</strong> indica o nível de implementação dos controles de segurança de IA.</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">Fórmula:</p>
          <p className="font-mono text-sm">Score = Resposta × Fator de Evidência</p>
        </div>
        <div>
          <p className="font-medium mb-2">Valores de Resposta:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Sim:</strong> 100%</li>
            <li><strong>Parcial:</strong> 50%</li>
            <li><strong>Não:</strong> 0%</li>
          </ul>
        </div>
        <div>
          <p className="font-medium mb-2">Multiplicador de Evidência:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Sim:</strong> 1.0× (sem penalidade)</li>
            <li><strong>Parcial:</strong> 0.9× (−10%)</li>
            <li><strong>Não:</strong> 0.7× (−30%)</li>
          </ul>
        </div>
        <div className="border-t pt-3">
          <p className="font-medium mb-2">Níveis de Maturidade:</p>
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span><strong>Nível 0 (0-24%):</strong> Inexistente - Sem práticas estabelecidas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              <span><strong>Nível 1 (25-49%):</strong> Inicial - Práticas ad-hoc</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span><strong>Nível 2 (50-79%):</strong> Definido - Processos documentados</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span><strong>Nível 3 (80-100%):</strong> Gerenciado - Melhoria contínua</span>
            </div>
          </div>
        </div>
      </div>
    </HelpTooltip>
  );
}

export function CoverageHelp() {
  return (
    <HelpTooltip title="O que significa?" modalTitle="Cobertura da Avaliação">
      <div className="space-y-3">
        <p><strong>Cobertura</strong> indica o percentual de perguntas respondidas em relação ao total de perguntas aplicáveis.</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">Fórmula:</p>
          <p className="font-mono text-sm">Cobertura = Perguntas Respondidas ÷ Total Aplicáveis</p>
        </div>
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">Importante:</p>
          <p className="text-amber-700 dark:text-amber-300">
            Cobertura ≠ Maturidade. Alta cobertura com baixo score indica que você conhece seus gaps. 
            Baixa cobertura significa que há áreas não avaliadas que podem esconder riscos.
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

export function EvidenceReadinessHelp() {
  return (
    <HelpTooltip title="O que significa?" modalTitle="Prontidão de Evidências">
      <div className="space-y-3">
        <p><strong>Prontidão de Evidências</strong> indica a disponibilidade de documentação comprobatória para os controles implementados.</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">Impacto no Score:</p>
          <p>Controles sem evidência recebem penalidade de <strong>10% a 30%</strong> no score efetivo.</p>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Para Auditorias:</p>
          <p className="text-blue-700 dark:text-blue-300">
            Prontidão de evidências é crítica para demonstrar conformidade. 
            Controles implementados mas sem evidência documental podem não ser aceitos por auditores externos.
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

// Domain-aware Critical Gaps help
const criticalGapsConfig: Record<string, {
  title: string;
  description: string;
  risks: string[];
  frameworkRef: string;
}> = {
  AI_SECURITY: {
    title: 'Gaps Críticos de IA',
    description: 'Controles de segurança de IA com score baixo (<50%) em subcategorias de alta criticidade.',
    risks: [
      'Viés e discriminação em modelos de IA',
      'Vazamento de dados de treinamento',
      'Ataques adversariais não mitigados',
      'Não conformidade com regulações de IA',
    ],
    frameworkRef: 'Priorização baseada no NIST AI RMF e impacto nos trustworthy AI principles.',
  },
  CLOUD_SECURITY: {
    title: 'Gaps Críticos de Cloud',
    description: 'Controles de segurança cloud com score baixo (<50%) em subcategorias de alta criticidade.',
    risks: [
      'Exposição de dados sensíveis na nuvem',
      'Configurações inseguras de IAM',
      'Falta de visibilidade em multi-cloud',
      'Violação do modelo de responsabilidade compartilhada',
    ],
    frameworkRef: 'Priorização baseada no CSA CCM e modelo de responsabilidade compartilhada.',
  },
  DEVSECOPS: {
    title: 'Gaps Críticos de Pipeline',
    description: 'Práticas de desenvolvimento seguro com score baixo (<50%) em subcategorias de alta criticidade.',
    risks: [
      'Vulnerabilidades em dependências',
      'Secrets expostos no código',
      'Pipeline de CI/CD comprometido',
      'Supply chain attacks',
    ],
    frameworkRef: 'Priorização baseada no NIST SSDF e SLSA framework.',
  },
};

interface DomainCriticalGapsHelpProps {
  securityDomainId?: string;
}

export function DomainCriticalGapsHelp({ securityDomainId = 'AI_SECURITY' }: DomainCriticalGapsHelpProps) {
  const config = criticalGapsConfig[securityDomainId] || criticalGapsConfig.AI_SECURITY;
  
  return (
    <HelpTooltip title="O que são?" modalTitle={config.title}>
      <div className="space-y-3">
        <p><strong>{config.title}:</strong> {config.description}</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">Metodologia de Priorização:</p>
          <p className="text-sm">Gaps são ordenados por criticidade (Crítico → Alto → Médio) e impacto no domínio.</p>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="font-medium text-red-700 dark:text-red-400 mb-2">Riscos específicos:</p>
          <ul className="list-disc list-inside space-y-1 text-red-700 dark:text-red-300 text-sm">
            {config.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </div>
        <div className="pt-2 border-t text-xs text-muted-foreground">
          {config.frameworkRef}
        </div>
      </div>
    </HelpTooltip>
  );
}

// Legacy export for backward compatibility
export function CriticalGapsHelp() {
  return <DomainCriticalGapsHelp securityDomainId="AI_SECURITY" />;
}

// Domain-aware Strategic Roadmap help
const roadmapConfig: Record<string, {
  title: string;
  description: string;
  prioritization: { period: string; criteria: string }[];
  frameworkRef: string;
}> = {
  AI_SECURITY: {
    title: 'Roadmap de Segurança de IA',
    description: 'Plano de ações priorizadas para mitigar riscos de IA nos próximos 90 dias.',
    prioritization: [
      { period: '0-30 dias', criteria: 'Gaps críticos em GOVERN e MAP do NIST AI RMF. Foco em governança e inventário.' },
      { period: '30-60 dias', criteria: 'Gaps em MEASURE. Implementar métricas e monitoramento de modelos.' },
      { period: '60-90 dias', criteria: 'Gaps em MANAGE. Estabelecer processos de resposta e melhoria contínua.' },
    ],
    frameworkRef: 'Metodologia alinhada ao ciclo de vida do NIST AI RMF.',
  },
  CLOUD_SECURITY: {
    title: 'Roadmap de Segurança Cloud',
    description: 'Plano de ações priorizadas para mitigar riscos cloud nos próximos 90 dias.',
    prioritization: [
      { period: '0-30 dias', criteria: 'Gaps críticos em IAM e configuração. Hardening imediato.' },
      { period: '30-60 dias', criteria: 'Gaps em proteção de dados e rede. Criptografia e segmentação.' },
      { period: '60-90 dias', criteria: 'Gaps em logging e compliance. Visibilidade e auditoria.' },
    ],
    frameworkRef: 'Metodologia alinhada aos domínios do CSA CCM.',
  },
  DEVSECOPS: {
    title: 'Roadmap DevSecOps',
    description: 'Plano de ações priorizadas para fortalecer o pipeline nos próximos 90 dias.',
    prioritization: [
      { period: '0-30 dias', criteria: 'Gaps em secrets management e SAST. Proteção de credenciais.' },
      { period: '30-60 dias', criteria: 'Gaps em SCA e container security. Gestão de dependências.' },
      { period: '60-90 dias', criteria: 'Gaps em DAST e runtime. Testes dinâmicos e observabilidade.' },
    ],
    frameworkRef: 'Metodologia alinhada ao NIST SSDF e OWASP DevSecOps Guidelines.',
  },
};

interface DomainRoadmapHelpProps {
  securityDomainId?: string;
}

export function DomainRoadmapHelp({ securityDomainId = 'AI_SECURITY' }: DomainRoadmapHelpProps) {
  const config = roadmapConfig[securityDomainId] || roadmapConfig.AI_SECURITY;
  
  return (
    <HelpTooltip title="Como priorizar?" modalTitle={config.title}>
      <div className="space-y-3">
        <p><strong>{config.title}:</strong> {config.description}</p>
        <div className="space-y-2">
          {config.prioritization.map((p) => (
            <div key={p.period} className="p-3 bg-muted rounded-lg">
              <p className="font-medium text-primary mb-1">{p.period}</p>
              <p className="text-sm">{p.criteria}</p>
            </div>
          ))}
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Dica:</p>
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            Clique nas ações para navegar diretamente para a pergunta correspondente na avaliação.
          </p>
        </div>
        <div className="pt-2 border-t text-xs text-muted-foreground">
          {config.frameworkRef}
        </div>
      </div>
    </HelpTooltip>
  );
}

// Domain-aware help content configuration
const domainHelpConfig: Record<string, {
  title: string;
  modalTitle: string;
  frameworkName: string;
  frameworkDescription: string;
  functions: { name: string; label: string; description: string }[];
  sourceUrl: string;
  sourceName: string;
}> = {
  AI_SECURITY: {
    title: 'Sobre NIST AI RMF',
    modalTitle: 'NIST AI Risk Management Framework',
    frameworkName: 'NIST AI Risk Management Framework',
    frameworkDescription: 'organiza a gestão de riscos de IA em 4 funções principais:',
    functions: [
      { name: 'GOVERN', label: 'Governar', description: 'Cultura, políticas, papéis e accountability para IA responsável. Define a estrutura organizacional e as responsabilidades.' },
      { name: 'MAP', label: 'Mapear', description: 'Identificação e categorização de riscos no contexto de uso. Entende onde e como a IA é utilizada.' },
      { name: 'MEASURE', label: 'Medir', description: 'Análise, avaliação e monitoramento de riscos identificados. Quantifica e acompanha os riscos ao longo do tempo.' },
      { name: 'MANAGE', label: 'Gerenciar', description: 'Priorização, resposta e tratamento de riscos. Implementa controles e mitiga as vulnerabilidades.' },
    ],
    sourceUrl: 'https://www.nist.gov/itl/ai-risk-management-framework',
    sourceName: 'NIST AI RMF',
  },
  CLOUD_SECURITY: {
    title: 'Sobre CSA CCM',
    modalTitle: 'Cloud Security Alliance - Cloud Controls Matrix',
    frameworkName: 'CSA Cloud Controls Matrix (CCM)',
    frameworkDescription: 'organiza os controles de segurança cloud em 4 pilares principais:',
    functions: [
      { name: 'GOVERN', label: 'Governança', description: 'Políticas, procedimentos e estrutura de governança para segurança cloud. Define responsabilidades compartilhadas entre provedor e cliente.' },
      { name: 'MANAGE', label: 'Gerenciamento', description: 'Gestão de identidades, acessos, configurações e recursos cloud. Controla permissões e configurações de segurança.' },
      { name: 'MEASURE', label: 'Monitoramento', description: 'Logging, auditoria e detecção de ameaças em ambientes cloud. Visibilidade contínua de eventos de segurança.' },
      { name: 'MAP', label: 'Mapeamento', description: 'Inventário de ativos, classificação de dados e mapeamento de riscos cloud. Conhecimento do ambiente e exposições.' },
    ],
    sourceUrl: 'https://cloudsecurityalliance.org/research/cloud-controls-matrix',
    sourceName: 'CSA CCM',
  },
  DEVSECOPS: {
    title: 'Sobre NIST SSDF',
    modalTitle: 'NIST Secure Software Development Framework',
    frameworkName: 'NIST Secure Software Development Framework (SSDF)',
    frameworkDescription: 'organiza as práticas de desenvolvimento seguro em 4 grupos principais:',
    functions: [
      { name: 'GOVERN', label: 'Políticas (PO)', description: 'Preparar a Organização: Definir requisitos de segurança, políticas e papéis. Estabelece a fundação para desenvolvimento seguro.' },
      { name: 'MAP', label: 'Preparação (PS)', description: 'Proteger o Software: Proteger código, builds e artefatos contra acesso não autorizado e adulteração.' },
      { name: 'MEASURE', label: 'Detecção (PW)', description: 'Produzir Software Bem Protegido: Práticas de código seguro, análise de vulnerabilidades e testes de segurança.' },
      { name: 'MANAGE', label: 'Resposta (RV)', description: 'Responder a Vulnerabilidades: Identificar, analisar e remediar vulnerabilidades descobertas em produção.' },
    ],
    sourceUrl: 'https://csrc.nist.gov/Projects/ssdf',
    sourceName: 'NIST SSDF',
  },
};

interface DomainFunctionHelpProps {
  securityDomainId?: string;
}

export function DomainFunctionHelp({ securityDomainId = 'AI_SECURITY' }: DomainFunctionHelpProps) {
  const config = domainHelpConfig[securityDomainId] || domainHelpConfig.AI_SECURITY;
  
  return (
    <HelpTooltip title={config.title} modalTitle={config.modalTitle}>
      <div className="space-y-3">
        <p><strong>{config.frameworkName}</strong> {config.frameworkDescription}</p>
        <div className="space-y-3">
          {config.functions.map((func) => (
            <div key={func.name} className="p-3 bg-muted rounded-lg">
              <p className="font-medium text-primary mb-1">{func.name} ({func.label})</p>
              <p>{func.description}</p>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t">
          <p className="text-sm">
            Fonte: <a href={config.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">{config.sourceName}</a>
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

// Legacy export for backward compatibility - now defaults to AI_SECURITY
export function NistFunctionHelp() {
  return <DomainFunctionHelp securityDomainId="AI_SECURITY" />;
}

export function FrameworkCategoryHelp() {
  return (
    <HelpTooltip title="O que são?" modalTitle="Categorias de Frameworks">
      <div className="space-y-3">
        <p><strong>Categorias de Frameworks</strong> agrupam frameworks relacionados para facilitar a análise e priorização.</p>
        <div className="space-y-2">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">🏛️ Frameworks Principais (Core)</p>
            <p className="text-sm">Frameworks fundamentais como NIST AI RMF e ISO 27001 que formam a base da governança de segurança.</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">⭐ Alto Valor</p>
            <p className="text-sm">Frameworks de gestão de riscos e privacidade como ISO 23894 e LGPD que agregam valor estratégico.</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">🔧 Foco Técnico</p>
            <p className="text-sm">Frameworks técnicos como OWASP e NIST SSDF focados em implementação e desenvolvimento seguro.</p>
          </div>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Dica:</p>
          <p className="text-blue-700 dark:text-blue-300">
            Clique nos badges de framework para filtrar a visualização por frameworks específicos.
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

export function CriticalityLevelsHelp() {
  return (
    <HelpTooltip title="Níveis de criticidade" modalTitle="Níveis de Criticidade">
      <div className="space-y-3">
        <p><strong>Criticidade</strong> indica a severidade do impacto caso um controle não seja implementado.</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2 rounded bg-red-50 dark:bg-red-950/30">
            <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <div>
              <span className="font-medium">Crítico:</span>
              <span className="text-sm ml-1">Impacto severo na segurança, conformidade ou operação. Ação imediata necessária.</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-orange-50 dark:bg-orange-950/30">
            <span className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0" />
            <div>
              <span className="font-medium">Alto:</span>
              <span className="text-sm ml-1">Risco significativo que pode afetar a organização. Prioridade alta.</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-blue-50 dark:bg-blue-950/30">
            <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
            <div>
              <span className="font-medium">Médio:</span>
              <span className="text-sm ml-1">Impacto moderado. Deve ser tratado no médio prazo.</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-gray-50 dark:bg-gray-950/30">
            <span className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />
            <div>
              <span className="font-medium">Baixo:</span>
              <span className="text-sm ml-1">Impacto limitado. Pode ser endereçado conforme recursos disponíveis.</span>
            </div>
          </div>
        </div>
      </div>
    </HelpTooltip>
  );
}

export function HeatmapHelp() {
  return (
    <HelpTooltip title="Como ler?" modalTitle="Mapa de Calor">
      <div className="space-y-3">
        <p><strong>Mapa de Calor</strong> visualiza o score de maturidade por subcategoria dentro de cada domínio.</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-2">Interpretação das cores:</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-4 rounded bg-red-500" />
              <span className="text-sm">0-24% - Controle inexistente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-4 rounded bg-orange-500" />
              <span className="text-sm">25-49% - Controle inicial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-4 rounded bg-yellow-500" />
              <span className="text-sm">50-79% - Controle definido</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-4 rounded bg-green-500" />
              <span className="text-sm">80-100% - Controle gerenciado</span>
            </div>
          </div>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Dica:</p>
          <p className="text-blue-700 dark:text-blue-300">
            Clique em qualquer célula para ver detalhes da subcategoria e navegar para as perguntas relacionadas.
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

export function OwnershipHelp() {
  return (
    <HelpTooltip title="O que significa?" modalTitle="Responsabilidade (Ownership)">
      <div className="space-y-3">
        <p><strong>Ownership</strong> indica qual área ou função organizacional é responsável por implementar e manter o controle.</p>
        <div className="space-y-2">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">🔐 Segurança da Informação</p>
            <p className="text-sm">Políticas, governança e controles de segurança</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">💻 Desenvolvimento / Engenharia</p>
            <p className="text-sm">Implementação técnica e ciclo de vida do software</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">📊 Data Science / ML</p>
            <p className="text-sm">Modelos, treinamento e validação de IA</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">⚖️ Jurídico / Compliance</p>
            <p className="text-sm">Conformidade regulatória e aspectos legais</p>
          </div>
        </div>
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">Importante:</p>
          <p className="text-amber-700 dark:text-amber-300">
            Filtrar por responsável ajuda a delegar tarefas e acompanhar o progresso de cada área.
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

// Domain-aware Response Distribution help
const responseDistributionConfig: Record<string, {
  title: string;
  description: string;
  context: string;
}> = {
  AI_SECURITY: {
    title: 'Distribuição de Respostas',
    description: 'mostra como os controles de segurança de IA estão classificados em termos de implementação.',
    context: 'A distribuição reflete o estado atual dos controles mapeados pelo NIST AI RMF e frameworks correlatos.',
  },
  CLOUD_SECURITY: {
    title: 'Distribuição de Respostas',
    description: 'mostra como os controles de segurança cloud estão classificados em termos de implementação.',
    context: 'A distribuição reflete o estado atual dos controles mapeados pelo CSA CCM e boas práticas de cloud security.',
  },
  DEVSECOPS: {
    title: 'Distribuição de Respostas',
    description: 'mostra como as práticas de desenvolvimento seguro estão classificadas em termos de implementação.',
    context: 'A distribuição reflete o estado atual das práticas mapeadas pelo NIST SSDF e frameworks de DevSecOps.',
  },
};

interface DomainResponseDistributionHelpProps {
  securityDomainId?: string;
}

export function DomainResponseDistributionHelp({ securityDomainId = 'AI_SECURITY' }: DomainResponseDistributionHelpProps) {
  const config = responseDistributionConfig[securityDomainId] || responseDistributionConfig.AI_SECURITY;
  
  return (
    <HelpTooltip title="O que significa?" modalTitle={config.title}>
      <div className="space-y-3">
        <p><strong>{config.title}</strong> {config.description}</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2 rounded bg-green-50 dark:bg-green-950/30">
            <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
            <div>
              <span className="font-medium">Sim:</span>
              <span className="text-sm ml-1">Controle totalmente implementado e operacional.</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-yellow-50 dark:bg-yellow-950/30">
            <span className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
            <div>
              <span className="font-medium">Parcial:</span>
              <span className="text-sm ml-1">Controle parcialmente implementado ou com limitações.</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-red-50 dark:bg-red-950/30">
            <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <div>
              <span className="font-medium">Não:</span>
              <span className="text-sm ml-1">Controle não implementado. Gap identificado.</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-gray-50 dark:bg-gray-950/30">
            <span className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />
            <div>
              <span className="font-medium">N/A:</span>
              <span className="text-sm ml-1">Não aplicável ao contexto da organização.</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-gray-50 dark:bg-gray-950/30">
            <span className="w-3 h-3 rounded-full bg-gray-300 flex-shrink-0" />
            <div>
              <span className="font-medium">Pendente:</span>
              <span className="text-sm ml-1">Pergunta ainda não respondida.</span>
            </div>
          </div>
        </div>
        <div className="pt-2 border-t text-xs text-muted-foreground">
          {config.context}
        </div>
      </div>
    </HelpTooltip>
  );
}

// Legacy export for backward compatibility
export function ResponseDistributionHelp() {
  return <DomainResponseDistributionHelp securityDomainId="AI_SECURITY" />;
}

// Domain-aware Risk Distribution / Criticality help
const riskDistributionConfig: Record<string, {
  title: string;
  description: string;
  frameworkRef: string;
}> = {
  AI_SECURITY: {
    title: 'Distribuição de Riscos de IA',
    description: 'Categorização dos gaps identificados por nível de criticidade em controles de segurança de IA.',
    frameworkRef: 'A criticidade é determinada com base no impacto potencial conforme NIST AI RMF e requisitos regulatórios.',
  },
  CLOUD_SECURITY: {
    title: 'Distribuição de Riscos Cloud',
    description: 'Categorização dos gaps identificados por nível de criticidade em controles de segurança cloud.',
    frameworkRef: 'A criticidade é determinada com base no modelo de responsabilidade compartilhada e controles CSA CCM.',
  },
  DEVSECOPS: {
    title: 'Distribuição de Riscos de Pipeline',
    description: 'Categorização dos gaps identificados por nível de criticidade nas práticas de desenvolvimento seguro.',
    frameworkRef: 'A criticidade é determinada com base no impacto na cadeia de supply chain de software (NIST SSDF).',
  },
};

interface DomainRiskDistributionHelpProps {
  securityDomainId?: string;
}

export function DomainRiskDistributionHelp({ securityDomainId = 'AI_SECURITY' }: DomainRiskDistributionHelpProps) {
  const config = riskDistributionConfig[securityDomainId] || riskDistributionConfig.AI_SECURITY;
  
  return (
    <HelpTooltip title="Níveis de risco" modalTitle={config.title}>
      <div className="space-y-3">
        <p><strong>{config.title}:</strong> {config.description}</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2 rounded bg-red-50 dark:bg-red-950/30">
            <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <div>
              <span className="font-medium">Crítico:</span>
              <span className="text-sm ml-1">Impacto severo. Ação imediata necessária.</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-orange-50 dark:bg-orange-950/30">
            <span className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0" />
            <div>
              <span className="font-medium">Alto:</span>
              <span className="text-sm ml-1">Risco significativo. Prioridade alta.</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-blue-50 dark:bg-blue-950/30">
            <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
            <div>
              <span className="font-medium">Médio:</span>
              <span className="text-sm ml-1">Impacto moderado. Médio prazo.</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-gray-50 dark:bg-gray-950/30">
            <span className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />
            <div>
              <span className="font-medium">Baixo:</span>
              <span className="text-sm ml-1">Impacto limitado. Conforme recursos.</span>
            </div>
          </div>
        </div>
        <div className="pt-2 border-t text-xs text-muted-foreground">
          {config.frameworkRef}
        </div>
      </div>
    </HelpTooltip>
  );
}

// Domain-aware Framework Coverage help
const frameworkCoverageConfig: Record<string, {
  title: string;
  description: string;
  frameworks: string[];
}> = {
  AI_SECURITY: {
    title: 'Cobertura de Frameworks de IA',
    description: 'Progresso da avaliação nos frameworks de segurança e governança de IA selecionados.',
    frameworks: ['NIST AI RMF', 'ISO 42001', 'EU AI Act', 'OWASP ML Top 10'],
  },
  CLOUD_SECURITY: {
    title: 'Cobertura de Frameworks Cloud',
    description: 'Progresso da avaliação nos frameworks de segurança cloud selecionados.',
    frameworks: ['CSA CCM', 'CIS Benchmarks', 'SOC 2', 'ISO 27017'],
  },
  DEVSECOPS: {
    title: 'Cobertura de Frameworks DevSecOps',
    description: 'Progresso da avaliação nos frameworks de desenvolvimento seguro selecionados.',
    frameworks: ['NIST SSDF', 'OWASP SAMM', 'SLSA', 'BSIMM'],
  },
};

interface DomainFrameworkCoverageHelpProps {
  securityDomainId?: string;
}

export function DomainFrameworkCoverageHelp({ securityDomainId = 'AI_SECURITY' }: DomainFrameworkCoverageHelpProps) {
  const config = frameworkCoverageConfig[securityDomainId] || frameworkCoverageConfig.AI_SECURITY;
  
  return (
    <HelpTooltip title="Sobre frameworks" modalTitle={config.title}>
      <div className="space-y-3">
        <p><strong>{config.title}:</strong> {config.description}</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-2">Frameworks de referência:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {config.frameworks.map((fw) => (
              <li key={fw}>{fw}</li>
            ))}
          </ul>
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">Métricas exibidas:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Score:</strong> Média ponderada das respostas</li>
            <li><strong>Cobertura:</strong> % de perguntas respondidas</li>
          </ul>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Dica:</p>
          <p className="text-blue-700 dark:text-blue-300">
            Clique nos badges de framework no header para filtrar a visualização.
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

// Domain-aware Domain Metrics help
const domainMetricsConfig: Record<string, {
  title: string;
  description: string;
  examples: string[];
}> = {
  AI_SECURITY: {
    title: 'Domínios de Segurança de IA',
    description: 'Áreas temáticas que agrupam controles de segurança de IA conforme NIST AI RMF.',
    examples: ['Governança de IA', 'Privacidade de Dados', 'Robustez de Modelos', 'Transparência'],
  },
  CLOUD_SECURITY: {
    title: 'Domínios de Segurança Cloud',
    description: 'Áreas temáticas que agrupam controles de segurança cloud conforme CSA CCM.',
    examples: ['Identidade e Acesso', 'Proteção de Dados', 'Segurança de Rede', 'Compliance'],
  },
  DEVSECOPS: {
    title: 'Domínios DevSecOps',
    description: 'Áreas temáticas que agrupam práticas de desenvolvimento seguro conforme NIST SSDF.',
    examples: ['Segurança de Pipeline', 'Análise de Código', 'Gestão de Dependências', 'Deploy Seguro'],
  },
};

interface DomainMetricsHelpProps {
  securityDomainId?: string;
}

export function DomainMetricsHelpAware({ securityDomainId = 'AI_SECURITY' }: DomainMetricsHelpProps) {
  const config = domainMetricsConfig[securityDomainId] || domainMetricsConfig.AI_SECURITY;
  
  return (
    <HelpTooltip title="O que são?" modalTitle={config.title}>
      <div className="space-y-3">
        <p><strong>{config.title}:</strong> {config.description}</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-2">Exemplos de domínios:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {config.examples.map((ex) => (
              <li key={ex}>{ex}</li>
            ))}
          </ul>
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-2">Métricas exibidas:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Cobertura:</strong> % de perguntas respondidas no domínio</li>
            <li><strong>Maturidade:</strong> Score ponderado dos controles</li>
            <li><strong>Gaps:</strong> Número de controles com score {"<"}50%</li>
          </ul>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Dica:</p>
          <p className="text-blue-700 dark:text-blue-300">
            Clique em um domínio para expandir e ver as subcategorias com suas métricas individuais.
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

export function DomainMetricsHelp() {
  return (
    <HelpTooltip title="O que são?" modalTitle="Métricas por Domínio">
      <div className="space-y-3">
        <p><strong>Domínios</strong> são áreas temáticas que agrupam controles de segurança relacionados.</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-2">Métricas exibidas:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Cobertura:</strong> % de perguntas respondidas no domínio</li>
            <li><strong>Maturidade:</strong> Score ponderado dos controles</li>
            <li><strong>Gaps:</strong> Número de controles com score {"<"}50%</li>
          </ul>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Dica:</p>
          <p className="text-blue-700 dark:text-blue-300">
            Clique em um domínio para expandir e ver as subcategorias com suas métricas individuais.
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

// Role-based persona badges
export type PersonaType = 'executive' | 'grc' | 'specialist';

interface PersonaBadgeProps {
  persona: PersonaType;
  selected?: boolean;
  onClick?: () => void;
}

const personaConfig: Record<PersonaType, { label: string; description: string }> = {
  executive: {
    label: 'Executivo',
    description: 'CISO / Head de Segurança - Visão estratégica e priorização de riscos'
  },
  grc: {
    label: 'GRC',
    description: 'Security Manager - Cobertura, evidências e auditabilidade'
  },
  specialist: {
    label: 'Especialista',
    description: 'Arquiteto / Engenheiro - Detalhes técnicos e implementação'
  }
};

export function PersonaBadge({ persona, selected, onClick }: PersonaBadgeProps) {
  const config = personaConfig[persona];
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg border transition-all text-left",
        selected 
          ? "bg-primary text-primary-foreground border-primary" 
          : "bg-card hover:bg-muted border-border"
      )}
    >
      <div className="font-medium">{config.label}</div>
      <div className={cn("text-xs mt-0.5", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {config.description}
      </div>
    </button>
  );
}

export function PersonaSelector({ 
  value, 
  onChange 
}: { 
  value: PersonaType; 
  onChange: (persona: PersonaType) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(personaConfig) as PersonaType[]).map(persona => (
        <PersonaBadge
          key={persona}
          persona={persona}
          selected={value === persona}
          onClick={() => onChange(persona)}
        />
      ))}
    </div>
  );
}
