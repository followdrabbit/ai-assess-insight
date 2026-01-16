import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cloud, Brain, GitBranch, Server, Shield, Workflow, AlertTriangle, CheckCircle2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActiveQuestion } from '@/lib/scoring';
import { Answer } from '@/lib/database';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { DomainIndicatorsTrendChart } from '@/components/DomainIndicatorsTrendChart';

interface DomainSpecificIndicatorsProps {
  securityDomainId: string;
  questions: ActiveQuestion[];
  answers: Map<string, Answer>;
}

interface IndicatorData {
  id: string;
  label: string;
  value: number;
  total: number;
  percentage: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
  frameworkRef?: string;
  detailedHelp?: string;
}

// Domain help content with framework references
const domainHelpContent: Record<string, { title: string; description: string; frameworks: { name: string; description: string }[]; pillars: { name: string; description: string }[] }> = {
  CLOUD_SECURITY: {
    title: 'Cloud Security',
    description: 'Segurança em ambientes de nuvem baseada nos controles do CSA Cloud Controls Matrix (CCM) e melhores práticas de segurança cloud.',
    frameworks: [
      { name: 'CSA CCM v4', description: 'Cloud Controls Matrix - Framework de controles de segurança cloud com 17 domínios e 197 objetivos de controle.' },
      { name: 'ISO 27017', description: 'Código de prática para controles de segurança da informação para serviços em nuvem.' },
      { name: 'ISO 27018', description: 'Código de prática para proteção de dados pessoais em nuvens públicas.' },
      { name: 'NIST SP 800-144', description: 'Guidelines on Security and Privacy in Public Cloud Computing.' }
    ],
    pillars: [
      { name: 'Governança Cloud', description: 'Políticas, procedimentos e estrutura organizacional para gerenciar segurança cloud.' },
      { name: 'Identidade e Acesso', description: 'IAM, autenticação federada, SSO, MFA e gestão de privilégios.' },
      { name: 'Proteção de Dados', description: 'Criptografia em repouso/trânsito, DLP, classificação e gestão de chaves.' },
      { name: 'Segurança de Rede', description: 'Segmentação, firewalls, WAF, Zero Trust e proteção de perímetro.' }
    ]
  },
  AI_SECURITY: {
    title: 'AI Security',
    description: 'Segurança de sistemas de Inteligência Artificial baseada no NIST AI Risk Management Framework e melhores práticas de ML Security.',
    frameworks: [
      { name: 'NIST AI RMF', description: 'Framework para gerenciamento de riscos em sistemas de IA com funções GOVERN, MAP, MEASURE e MANAGE.' },
      { name: 'ISO/IEC 23894', description: 'Guidance on AI risk management - extensão da ISO 31000 para IA.' },
      { name: 'OWASP LLM Top 10', description: 'Top 10 vulnerabilidades em aplicações com Large Language Models.' },
      { name: 'MITRE ATLAS', description: 'Adversarial Threat Landscape for AI Systems - táticas e técnicas de ataques a ML.' }
    ],
    pillars: [
      { name: 'Riscos de Modelo', description: 'Drift, degradação, overfitting, underfitting e vulnerabilidades do modelo.' },
      { name: 'Governança de Dados', description: 'Qualidade, proveniência, viés nos dados de treinamento e validação.' },
      { name: 'Segurança Adversarial', description: 'Proteção contra prompt injection, jailbreaks, evasion e poisoning attacks.' },
      { name: 'Ética e Fairness', description: 'Viés algorítmico, explicabilidade, transparência e accountability.' }
    ]
  },
  DEVSECOPS: {
    title: 'DevSecOps',
    description: 'Integração de segurança no ciclo de desenvolvimento baseada no NIST SSDF e práticas de Secure Software Development.',
    frameworks: [
      { name: 'NIST SSDF', description: 'Secure Software Development Framework - práticas fundamentais para desenvolvimento seguro.' },
      { name: 'OWASP SAMM', description: 'Software Assurance Maturity Model - modelo de maturidade em segurança de software.' },
      { name: 'SLSA', description: 'Supply-chain Levels for Software Artifacts - framework para integridade da supply chain.' },
      { name: 'CIS Software Supply Chain', description: 'Benchmark para segurança da cadeia de suprimentos de software.' }
    ],
    pillars: [
      { name: 'Pipeline CI/CD', description: 'Segurança integrada em build, test, deploy com gates de segurança.' },
      { name: 'Análise de Código', description: 'SAST, code review, secure coding standards e IDE security plugins.' },
      { name: 'Gestão de Dependências', description: 'SCA, SBOM, vulnerability management e third-party risk.' },
      { name: 'Container Security', description: 'Image scanning, runtime protection, K8s security e registry hardening.' }
    ]
  }
};

// Keywords to identify CSP-related questions
const CSP_KEYWORDS = ['aws', 'azure', 'gcp', 'google cloud', 'multi-cloud', 'cloud provider', 'csp', 'iaas', 'paas', 'saas'];

// Keywords to identify model risk questions
const MODEL_RISK_KEYWORDS = ['model', 'ml', 'machine learning', 'training', 'inference', 'bias', 'drift', 'adversarial', 'prompt injection', 'hallucination', 'llm'];

// Keywords to identify pipeline security questions
const PIPELINE_KEYWORDS = ['pipeline', 'ci/cd', 'cicd', 'build', 'deploy', 'artifact', 'container', 'registry', 'sast', 'dast', 'sca', 'sbom'];

// Keywords for identity/access
const IDENTITY_KEYWORDS = ['identity', 'iam', 'access', 'authentication', 'authorization', 'rbac', 'privilege'];

// Keywords for data protection
const DATA_PROTECTION_KEYWORDS = ['encryption', 'data protection', 'data loss', 'dlp', 'key management', 'kms', 'secrets'];

// Keywords for network security
const NETWORK_KEYWORDS = ['network', 'firewall', 'waf', 'vpn', 'segmentation', 'zero trust', 'perimeter'];

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(kw => lowerText.includes(kw.toLowerCase()));
}

function calculateIndicator(
  questions: ActiveQuestion[], 
  answers: Map<string, Answer>,
  keywords: string[]
): { matched: number; answered: number; positive: number } {
  const matchedQuestions = questions.filter(q => matchesKeywords(q.questionText, keywords));
  const answered = matchedQuestions.filter(q => {
    const answer = answers.get(q.questionId);
    return answer?.response && ['Sim', 'Parcial'].includes(answer.response);
  }).length;
  
  return {
    matched: matchedQuestions.length,
    answered,
    positive: answered
  };
}

function getCloudSecurityIndicators(questions: ActiveQuestion[], answers: Map<string, Answer>, t: (key: string) => string): IndicatorData[] {
  const cspData = calculateIndicator(questions, answers, CSP_KEYWORDS);
  const identityData = calculateIndicator(questions, answers, IDENTITY_KEYWORDS);
  const dataData = calculateIndicator(questions, answers, DATA_PROTECTION_KEYWORDS);
  const networkData = calculateIndicator(questions, answers, NETWORK_KEYWORDS);

  return [
    {
      id: 'csp-coverage',
      label: t('help.cspCoverage'),
      value: cspData.positive,
      total: cspData.matched,
      percentage: cspData.matched > 0 ? (cspData.positive / cspData.matched) * 100 : 0,
      icon: <Cloud className="h-5 w-5" />,
      color: 'text-sky-500',
      bgColor: 'bg-sky-500/10',
      description: t('help.cspCoverageDesc'),
      frameworkRef: 'CSA CCM: AIS, BCR, CCC',
      detailedHelp: t('help.cspCoverageDesc')
    },
    {
      id: 'identity-security',
      label: t('help.identitySecurity'),
      value: identityData.positive,
      total: identityData.matched,
      percentage: identityData.matched > 0 ? (identityData.positive / identityData.matched) * 100 : 0,
      icon: <Shield className="h-5 w-5" />,
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10',
      description: t('help.identitySecurityDesc'),
      frameworkRef: 'CSA CCM: IAM, HRS',
      detailedHelp: t('help.identitySecurityDesc')
    },
    {
      id: 'data-protection',
      label: t('help.dataProtection'),
      value: dataData.positive,
      total: dataData.matched,
      percentage: dataData.matched > 0 ? (dataData.positive / dataData.matched) * 100 : 0,
      icon: <Server className="h-5 w-5" />,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      description: t('help.dataProtectionDesc'),
      frameworkRef: 'CSA CCM: DSP, EKM',
      detailedHelp: t('help.dataProtectionDesc')
    },
    {
      id: 'network-security',
      label: t('help.networkSecurity'),
      value: networkData.positive,
      total: networkData.matched,
      percentage: networkData.matched > 0 ? (networkData.positive / networkData.matched) * 100 : 0,
      icon: <Workflow className="h-5 w-5" />,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      description: t('help.networkSecurityDesc'),
      frameworkRef: 'CSA CCM: IVS, TVM',
      detailedHelp: t('help.networkSecurityDesc')
    }
  ];
}

function getAISecurityIndicators(questions: ActiveQuestion[], answers: Map<string, Answer>, t: (key: string) => string): IndicatorData[] {
  const modelData = calculateIndicator(questions, answers, MODEL_RISK_KEYWORDS);
  const dataData = calculateIndicator(questions, answers, ['training data', 'dataset', 'data quality', 'data governance']);
  const adversarialData = calculateIndicator(questions, answers, ['adversarial', 'attack', 'injection', 'jailbreak', 'prompt']);
  const biasData = calculateIndicator(questions, answers, ['bias', 'fairness', 'discrimination', 'ethics', 'explainability']);

  return [
    {
      id: 'model-risks',
      label: t('help.modelRisks'),
      value: modelData.positive,
      total: modelData.matched,
      percentage: modelData.matched > 0 ? (modelData.positive / modelData.matched) * 100 : 0,
      icon: <Brain className="h-5 w-5" />,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      description: t('help.modelRisksDesc'),
      frameworkRef: 'NIST AI RMF: MEASURE, MANAGE',
      detailedHelp: t('help.modelRisksDesc')
    },
    {
      id: 'data-governance',
      label: t('help.dataGovernance'),
      value: dataData.positive,
      total: dataData.matched,
      percentage: dataData.matched > 0 ? (dataData.positive / dataData.matched) * 100 : 0,
      icon: <Server className="h-5 w-5" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      description: t('help.dataGovernanceDesc'),
      frameworkRef: 'NIST AI RMF: MAP',
      detailedHelp: t('help.dataGovernanceDesc')
    },
    {
      id: 'adversarial-defense',
      label: t('help.adversarialDefense'),
      value: adversarialData.positive,
      total: adversarialData.matched,
      percentage: adversarialData.matched > 0 ? (adversarialData.positive / adversarialData.matched) * 100 : 0,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      description: t('help.adversarialDefenseDesc'),
      frameworkRef: 'OWASP LLM Top 10, MITRE ATLAS',
      detailedHelp: t('help.adversarialDefenseDesc')
    },
    {
      id: 'bias-ethics',
      label: t('help.biasEthics'),
      value: biasData.positive,
      total: biasData.matched,
      percentage: biasData.matched > 0 ? (biasData.positive / biasData.matched) * 100 : 0,
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      description: t('help.biasEthicsDesc'),
      frameworkRef: 'NIST AI RMF: GOVERN, ISO 23894',
      detailedHelp: t('help.biasEthicsDesc')
    }
  ];
}

function getDevSecOpsIndicators(questions: ActiveQuestion[], answers: Map<string, Answer>, t: (key: string) => string): IndicatorData[] {
  const pipelineData = calculateIndicator(questions, answers, PIPELINE_KEYWORDS);
  const codeSecurityData = calculateIndicator(questions, answers, ['code review', 'static analysis', 'sast', 'code scanning', 'secure coding']);
  const dependencyData = calculateIndicator(questions, answers, ['dependency', 'sca', 'sbom', 'vulnerability', 'cve', 'third-party']);
  const containerData = calculateIndicator(questions, answers, ['container', 'docker', 'kubernetes', 'k8s', 'image', 'registry']);

  return [
    {
      id: 'pipeline-coverage',
      label: t('help.pipelineCoverage'),
      value: pipelineData.positive,
      total: pipelineData.matched,
      percentage: pipelineData.matched > 0 ? (pipelineData.positive / pipelineData.matched) * 100 : 0,
      icon: <GitBranch className="h-5 w-5" />,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      description: t('help.pipelineCoverageDesc'),
      frameworkRef: 'NIST SSDF: PW, RV',
      detailedHelp: t('help.pipelineCoverageDesc')
    },
    {
      id: 'code-security',
      label: t('help.codeSecurity'),
      value: codeSecurityData.positive,
      total: codeSecurityData.matched,
      percentage: codeSecurityData.matched > 0 ? (codeSecurityData.positive / codeSecurityData.matched) * 100 : 0,
      icon: <Shield className="h-5 w-5" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      description: t('help.codeSecurityDesc'),
      frameworkRef: 'NIST SSDF: PW, OWASP SAMM',
      detailedHelp: t('help.codeSecurityDesc')
    },
    {
      id: 'dependency-management',
      label: t('help.dependencyManagement'),
      value: dependencyData.positive,
      total: dependencyData.matched,
      percentage: dependencyData.matched > 0 ? (dependencyData.positive / dependencyData.matched) * 100 : 0,
      icon: <Workflow className="h-5 w-5" />,
      color: 'text-teal-500',
      bgColor: 'bg-teal-500/10',
      description: t('help.dependencyManagementDesc'),
      frameworkRef: 'SLSA, CIS Supply Chain',
      detailedHelp: t('help.dependencyManagementDesc')
    },
    {
      id: 'container-security',
      label: t('help.containerSecurity'),
      value: containerData.positive,
      total: containerData.matched,
      percentage: containerData.matched > 0 ? (containerData.positive / containerData.matched) * 100 : 0,
      icon: <Server className="h-5 w-5" />,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
      description: t('help.containerSecurityDesc'),
      frameworkRef: 'CIS Docker/K8s Benchmarks',
      detailedHelp: t('help.containerSecurityDesc')
    }
  ];
}

function DomainHelpPopover({ securityDomainId }: { securityDomainId: string }) {
  const { t } = useTranslation();
  const helpContent = domainHelpContent[securityDomainId] || domainHelpContent.AI_SECURITY;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="p-1 rounded-full hover:bg-muted/50 transition-colors">
          <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4" side="bottom" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm">{helpContent.title}</h4>
            <p className="text-xs text-muted-foreground mt-1">{helpContent.description}</p>
          </div>
          
          <div>
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t('help.referenceFrameworksHeader')}</h5>
            <div className="space-y-2">
              {helpContent.frameworks.map((fw, idx) => (
                <div key={idx} className="text-xs">
                  <span className="font-medium">{fw.name}:</span>{' '}
                  <span className="text-muted-foreground">{fw.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t('help.pillarsEvaluated')}</h5>
            <div className="grid grid-cols-2 gap-2">
              {helpContent.pillars.map((pillar, idx) => (
                <div key={idx} className="p-2 rounded-md bg-muted/50">
                  <div className="text-xs font-medium">{pillar.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{pillar.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DomainSpecificIndicators({ securityDomainId, questions, answers }: DomainSpecificIndicatorsProps) {
  const { t } = useTranslation();
  
  const indicators = useMemo(() => {
    switch (securityDomainId) {
      case 'CLOUD_SECURITY':
        return getCloudSecurityIndicators(questions, answers, t);
      case 'AI_SECURITY':
        return getAISecurityIndicators(questions, answers, t);
      case 'DEVSECOPS':
        return getDevSecOpsIndicators(questions, answers, t);
      default:
        return getAISecurityIndicators(questions, answers, t);
    }
  }, [securityDomainId, questions, answers, t]);

  const domainLabel = useMemo(() => {
    switch (securityDomainId) {
      case 'CLOUD_SECURITY':
        return t('help.indicatorsCloudSecurity');
      case 'AI_SECURITY':
        return t('help.indicatorsAISecurity');
      case 'DEVSECOPS':
        return t('help.indicatorsDevSecOps');
      default:
        return t('help.indicatorsSpecific');
    }
  }, [securityDomainId, t]);

  const [showTrend, setShowTrend] = useState(false);

  return (
    <div className="space-y-4">
      <div className="card-elevated p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground">{domainLabel}</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setShowTrend(!showTrend)}
            >
              {showTrend ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showTrend ? t('help.hideTrend') : t('help.showTrend')}
            </Button>
            <DomainHelpPopover securityDomainId={securityDomainId} />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {indicators.map((indicator) => (
            <TooltipProvider key={indicator.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "p-4 rounded-lg border transition-all hover:shadow-md hover:scale-[1.02] cursor-help",
                    indicator.bgColor
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn("p-1.5 rounded-md", indicator.bgColor, indicator.color)}>
                        {indicator.icon}
                      </div>
                      <span className="text-xs font-medium text-muted-foreground truncate">
                        {indicator.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className={cn("text-2xl font-bold", indicator.color)}>
                        {Math.round(indicator.percentage)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({indicator.value}/{indicator.total})
                      </span>
                    </div>
                    {indicator.frameworkRef && (
                      <div className="text-[10px] text-muted-foreground/70 mt-1 truncate">
                        {indicator.frameworkRef}
                      </div>
                    )}
                    <div className="mt-2 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500")}
                        style={{ 
                          width: `${indicator.percentage}%`,
                          backgroundColor: `hsl(var(--${indicator.color.replace('text-', '').split('-')[0]}-500))` 
                        }}
                      />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm p-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{indicator.label}</p>
                    <p className="text-xs text-muted-foreground">{indicator.detailedHelp || indicator.description}</p>
                    <div className="flex items-center justify-between text-xs pt-1 border-t">
                      <span className="text-muted-foreground">{indicator.value} de {indicator.total} questões atendidas</span>
                      {indicator.frameworkRef && (
                        <span className="text-primary/70 font-mono text-[10px]">{indicator.frameworkRef}</span>
                      )}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {/* Trend Chart - Collapsible */}
      {showTrend && (
        <DomainIndicatorsTrendChart 
          securityDomainId={securityDomainId}
          className="animate-in fade-in-0 slide-in-from-top-4 duration-300"
        />
      )}
    </div>
  );
}
