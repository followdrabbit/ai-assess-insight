import { useMemo } from 'react';
import { Cloud, Brain, GitBranch, Server, Shield, Workflow, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActiveQuestion } from '@/lib/scoring';
import { Answer } from '@/lib/database';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
}

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
      description: 'Questões relacionadas a Cloud Service Providers respondidas positivamente'
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
      description: 'Controles de IAM, autenticação e autorização implementados'
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
      description: 'Criptografia, DLP e gestão de chaves'
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
      description: 'Firewalls, segmentação e Zero Trust'
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
      description: 'Riscos associados a modelos de ML/IA mitigados'
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
      description: 'Qualidade e governança dos dados de treinamento'
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
      description: 'Proteção contra ataques adversariais e injeções'
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
      description: 'Controles de viés, fairness e explicabilidade'
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
      description: 'Segurança integrada no pipeline CI/CD'
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
      description: 'Análise estática e revisão de código seguro'
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
      description: 'SCA, SBOM e gestão de vulnerabilidades'
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
      description: 'Segurança de imagens e orquestração'
    }
  ];
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
      <h3 className="text-sm font-semibold mb-4 text-muted-foreground">{domainLabel}</h3>
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
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-sm">{indicator.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {indicator.value} de {indicator.total} questões atendidas
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}
