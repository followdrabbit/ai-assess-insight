import { useMemo } from 'react';
import { Cloud, Brain, GitBranch, Server, Shield, Workflow, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActiveQuestion } from '@/lib/scoring';
import { Answer } from '@/lib/database';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

function getCloudSecurityIndicators(questions: ActiveQuestion[], answers: Map<string, Answer>): IndicatorData[] {
  const cspData = calculateIndicator(questions, answers, CSP_KEYWORDS);
  const identityData = calculateIndicator(questions, answers, IDENTITY_KEYWORDS);
  const dataData = calculateIndicator(questions, answers, DATA_PROTECTION_KEYWORDS);
  const networkData = calculateIndicator(questions, answers, NETWORK_KEYWORDS);

  return [
    {
      id: 'csp-coverage',
      label: 'Cobertura de CSPs',
      value: cspData.positive,
      total: cspData.matched,
      percentage: cspData.matched > 0 ? (cspData.positive / cspData.matched) * 100 : 0,
      icon: <Cloud className="h-5 w-5" />,
      color: 'text-sky-500',
      bgColor: 'bg-sky-500/10',
      description: 'Questões relacionadas a Cloud Service Providers respondidas positivamente',
      frameworkRef: 'CSA CCM: AIS, BCR, CCC',
      detailedHelp: 'Avalia a cobertura de controles específicos para provedores de cloud (AWS, Azure, GCP). Baseado nos domínios AIS (Application & Interface Security), BCR (Business Continuity) e CCC (Change Control) do CSA CCM.'
    },
    {
      id: 'identity-security',
      label: 'Segurança de Identidade',
      value: identityData.positive,
      total: identityData.matched,
      percentage: identityData.matched > 0 ? (identityData.positive / identityData.matched) * 100 : 0,
      icon: <Shield className="h-5 w-5" />,
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10',
      description: 'Controles de IAM, autenticação e autorização implementados',
      frameworkRef: 'CSA CCM: IAM, HRS',
      detailedHelp: 'Mede a implementação de controles de Identity & Access Management. Cobre domínios IAM (Identity & Access Management) e HRS (Human Resources Security) do CSA CCM, incluindo MFA, SSO, RBAC e gestão de privilégios.'
    },
    {
      id: 'data-protection',
      label: 'Proteção de Dados',
      value: dataData.positive,
      total: dataData.matched,
      percentage: dataData.matched > 0 ? (dataData.positive / dataData.matched) * 100 : 0,
      icon: <Server className="h-5 w-5" />,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      description: 'Criptografia, DLP e gestão de chaves',
      frameworkRef: 'CSA CCM: DSP, EKM',
      detailedHelp: 'Avalia controles de proteção de dados em cloud. Baseado nos domínios DSP (Data Security & Privacy) e EKM (Encryption & Key Management) do CSA CCM, cobrindo criptografia, classificação, DLP e gestão de chaves.'
    },
    {
      id: 'network-security',
      label: 'Segurança de Rede',
      value: networkData.positive,
      total: networkData.matched,
      percentage: networkData.matched > 0 ? (networkData.positive / networkData.matched) * 100 : 0,
      icon: <Workflow className="h-5 w-5" />,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      description: 'Firewalls, segmentação e Zero Trust',
      frameworkRef: 'CSA CCM: IVS, TVM',
      detailedHelp: 'Mede a segurança de rede em ambientes cloud. Cobre domínios IVS (Infrastructure & Virtualization Security) e TVM (Threat & Vulnerability Management) do CSA CCM, incluindo segmentação, firewalls, WAF e Zero Trust.'
    }
  ];
}

function getAISecurityIndicators(questions: ActiveQuestion[], answers: Map<string, Answer>): IndicatorData[] {
  const modelData = calculateIndicator(questions, answers, MODEL_RISK_KEYWORDS);
  const dataData = calculateIndicator(questions, answers, ['training data', 'dataset', 'data quality', 'data governance']);
  const adversarialData = calculateIndicator(questions, answers, ['adversarial', 'attack', 'injection', 'jailbreak', 'prompt']);
  const biasData = calculateIndicator(questions, answers, ['bias', 'fairness', 'discrimination', 'ethics', 'explainability']);

  return [
    {
      id: 'model-risks',
      label: 'Riscos de Modelo',
      value: modelData.positive,
      total: modelData.matched,
      percentage: modelData.matched > 0 ? (modelData.positive / modelData.matched) * 100 : 0,
      icon: <Brain className="h-5 w-5" />,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      description: 'Riscos associados a modelos de ML/IA mitigados',
      frameworkRef: 'NIST AI RMF: MEASURE, MANAGE',
      detailedHelp: 'Avalia a gestão de riscos específicos de modelos de ML/IA. Baseado nas funções MEASURE (medir riscos) e MANAGE (gerenciar riscos) do NIST AI RMF, cobrindo drift, degradação, robustez e confiabilidade do modelo.'
    },
    {
      id: 'data-governance',
      label: 'Governança de Dados',
      value: dataData.positive,
      total: dataData.matched,
      percentage: dataData.matched > 0 ? (dataData.positive / dataData.matched) * 100 : 0,
      icon: <Server className="h-5 w-5" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      description: 'Qualidade e governança dos dados de treinamento',
      frameworkRef: 'NIST AI RMF: MAP',
      detailedHelp: 'Mede a governança de dados para sistemas de IA. Alinhado à função MAP do NIST AI RMF, avalia proveniência, qualidade, representatividade e viés nos dados de treinamento e validação.'
    },
    {
      id: 'adversarial-defense',
      label: 'Defesa Adversarial',
      value: adversarialData.positive,
      total: adversarialData.matched,
      percentage: adversarialData.matched > 0 ? (adversarialData.positive / adversarialData.matched) * 100 : 0,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      description: 'Proteção contra ataques adversariais e injeções',
      frameworkRef: 'OWASP LLM Top 10, MITRE ATLAS',
      detailedHelp: 'Avalia defesas contra ataques adversariais em sistemas de IA. Baseado no OWASP LLM Top 10 (prompt injection, jailbreaks) e MITRE ATLAS (táticas e técnicas de ataque a ML), cobre evasion, poisoning e extraction attacks.'
    },
    {
      id: 'bias-ethics',
      label: 'Ética e Viés',
      value: biasData.positive,
      total: biasData.matched,
      percentage: biasData.matched > 0 ? (biasData.positive / biasData.matched) * 100 : 0,
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      description: 'Controles de viés, fairness e explicabilidade',
      frameworkRef: 'NIST AI RMF: GOVERN, ISO 23894',
      detailedHelp: 'Mede aspectos éticos e de fairness em IA. Alinhado à função GOVERN do NIST AI RMF e ISO 23894, avalia detecção de viés, explicabilidade (XAI), transparência e accountability algorítmica.'
    }
  ];
}

function getDevSecOpsIndicators(questions: ActiveQuestion[], answers: Map<string, Answer>): IndicatorData[] {
  const pipelineData = calculateIndicator(questions, answers, PIPELINE_KEYWORDS);
  const codeSecurityData = calculateIndicator(questions, answers, ['code review', 'static analysis', 'sast', 'code scanning', 'secure coding']);
  const dependencyData = calculateIndicator(questions, answers, ['dependency', 'sca', 'sbom', 'vulnerability', 'cve', 'third-party']);
  const containerData = calculateIndicator(questions, answers, ['container', 'docker', 'kubernetes', 'k8s', 'image', 'registry']);

  return [
    {
      id: 'pipeline-coverage',
      label: 'Cobertura de Pipeline',
      value: pipelineData.positive,
      total: pipelineData.matched,
      percentage: pipelineData.matched > 0 ? (pipelineData.positive / pipelineData.matched) * 100 : 0,
      icon: <GitBranch className="h-5 w-5" />,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      description: 'Segurança integrada no pipeline CI/CD',
      frameworkRef: 'NIST SSDF: PW, RV',
      detailedHelp: 'Avalia a integração de segurança no pipeline CI/CD. Baseado nas práticas PW (Produce Well-Secured Software) e RV (Respond to Vulnerabilities) do NIST SSDF, cobre security gates, automação e integração contínua de segurança.'
    },
    {
      id: 'code-security',
      label: 'Segurança de Código',
      value: codeSecurityData.positive,
      total: codeSecurityData.matched,
      percentage: codeSecurityData.matched > 0 ? (codeSecurityData.positive / codeSecurityData.matched) * 100 : 0,
      icon: <Shield className="h-5 w-5" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      description: 'Análise estática e revisão de código seguro',
      frameworkRef: 'NIST SSDF: PW, OWASP SAMM',
      detailedHelp: 'Mede práticas de código seguro. Alinhado ao NIST SSDF prática PW e OWASP SAMM, avalia SAST, code review, secure coding standards, treinamento de desenvolvedores e IDE security plugins.'
    },
    {
      id: 'dependency-management',
      label: 'Gestão de Dependências',
      value: dependencyData.positive,
      total: dependencyData.matched,
      percentage: dependencyData.matched > 0 ? (dependencyData.positive / dependencyData.matched) * 100 : 0,
      icon: <Workflow className="h-5 w-5" />,
      color: 'text-teal-500',
      bgColor: 'bg-teal-500/10',
      description: 'SCA, SBOM e gestão de vulnerabilidades',
      frameworkRef: 'SLSA, CIS Supply Chain',
      detailedHelp: 'Avalia segurança da cadeia de dependências. Baseado no SLSA (Supply-chain Levels for Software Artifacts) e CIS Software Supply Chain, cobre SCA, SBOM, vulnerability management e third-party risk assessment.'
    },
    {
      id: 'container-security',
      label: 'Segurança de Containers',
      value: containerData.positive,
      total: containerData.matched,
      percentage: containerData.matched > 0 ? (containerData.positive / containerData.matched) * 100 : 0,
      icon: <Server className="h-5 w-5" />,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
      description: 'Segurança de imagens e orquestração',
      frameworkRef: 'CIS Docker/K8s Benchmarks',
      detailedHelp: 'Mede segurança de containers e orquestração. Alinhado aos CIS Docker e Kubernetes Benchmarks, avalia image scanning, runtime protection, secrets management, network policies e registry hardening.'
    }
  ];
}

function DomainHelpPopover({ securityDomainId }: { securityDomainId: string }) {
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
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Frameworks de Referência</h5>
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
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Pilares Avaliados</h5>
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
  const indicators = useMemo(() => {
    switch (securityDomainId) {
      case 'CLOUD_SECURITY':
        return getCloudSecurityIndicators(questions, answers);
      case 'AI_SECURITY':
        return getAISecurityIndicators(questions, answers);
      case 'DEVSECOPS':
        return getDevSecOpsIndicators(questions, answers);
      default:
        return getAISecurityIndicators(questions, answers);
    }
  }, [securityDomainId, questions, answers]);

  const domainLabel = useMemo(() => {
    switch (securityDomainId) {
      case 'CLOUD_SECURITY':
        return 'Indicadores Cloud Security';
      case 'AI_SECURITY':
        return 'Indicadores AI Security';
      case 'DEVSECOPS':
        return 'Indicadores DevSecOps';
      default:
        return 'Indicadores Específicos';
    }
  }, [securityDomainId]);

  return (
    <div className="card-elevated p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground">{domainLabel}</h3>
        <DomainHelpPopover securityDomainId={securityDomainId} />
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
  );
}
