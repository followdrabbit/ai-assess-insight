import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnswersStore } from '@/lib/stores';
import { calculateOverallMetrics, getCriticalGaps, getFrameworkCoverage } from '@/lib/scoring';
import { cn } from '@/lib/utils';
import { 
  MaturityScoreHelp, 
  CoverageHelp, 
  EvidenceReadinessHelp 
} from '@/components/HelpTooltip';
import { FrameworkCategoryId } from '@/lib/dataset';

// Framework category display names and colors
const frameworkCategoryLabels: Record<FrameworkCategoryId, string> = {
  AI_GOVERNANCE: 'Governança de IA',
  SECURITY_FOUNDATION: 'Fundamentos de Segurança',
  ENGINEERING: 'Engenharia',
  PRIVACY: 'Privacidade',
  FINANCIAL_BR: 'Regulação Financeira BR',
  THREAT_INTELLIGENCE: 'Inteligência de Ameaças',
};

const frameworkCategoryColors: Record<FrameworkCategoryId, string> = {
  AI_GOVERNANCE: 'hsl(var(--chart-1))',
  SECURITY_FOUNDATION: 'hsl(var(--chart-2))',
  ENGINEERING: 'hsl(var(--chart-3))',
  PRIVACY: 'hsl(var(--chart-4))',
  FINANCIAL_BR: 'hsl(var(--chart-5))',
  THREAT_INTELLIGENCE: 'hsl(221, 83%, 53%)',
};

export default function DashboardGRC() {
  const { answers, isLoading } = useAnswersStore();
  const navigate = useNavigate();

  const metrics = useMemo(() => calculateOverallMetrics(answers), [answers]);
  const frameworkCoverage = useMemo(() => getFrameworkCoverage(answers), [answers]);

  const ownershipData = metrics.ownershipMetrics.map(om => ({
    name: om.ownershipType,
    score: Math.round(om.score * 100),
    coverage: Math.round(om.coverage * 100),
    total: om.totalQuestions,
    answered: om.answeredQuestions,
  }));

  const frameworkCategoryData = metrics.frameworkCategoryMetrics
    .filter(fc => fc.totalQuestions > 0)
    .map(fc => ({
      categoryId: fc.categoryId,
      name: frameworkCategoryLabels[fc.categoryId] || fc.categoryId,
      score: Math.round(fc.score * 100),
      coverage: Math.round(fc.coverage * 100),
      totalQuestions: fc.totalQuestions,
      answeredQuestions: fc.answeredQuestions,
      color: frameworkCategoryColors[fc.categoryId] || 'hsl(var(--primary))',
      maturityLevel: fc.maturityLevel,
    }));

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard GRC</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Governança, Riscos e Compliance - Foco em cobertura e evidências
        </p>
      </div>

      {answers.size === 0 && (
        <div className="card-elevated p-6 text-center">
          <p className="text-muted-foreground mb-4">Nenhuma avaliação realizada ainda.</p>
          <button 
            onClick={() => navigate('/assessment')}
            className="text-primary hover:underline font-medium"
          >
            Iniciar avaliação
          </button>
        </div>
      )}

      {/* GRC KPI Cards */}
      <div className="stats-grid">
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-1">
            <div className="kpi-label">Cobertura Geral</div>
            <CoverageHelp />
          </div>
          <div className="kpi-value">{Math.round(metrics.coverage * 100)}%</div>
          <div className="text-sm text-muted-foreground mt-2">
            {metrics.answeredQuestions} de {metrics.totalQuestions}
          </div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-1">
            <div className="kpi-label">Prontidão de Evidências</div>
            <EvidenceReadinessHelp />
          </div>
          <div className="kpi-value">{Math.round(metrics.evidenceReadiness * 100)}%</div>
          <div className="text-sm text-muted-foreground mt-2">
            Para auditoria
          </div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-1">
            <div className="kpi-label">Score Geral</div>
            <MaturityScoreHelp />
          </div>
          <div className="kpi-value" style={{ color: metrics.maturityLevel.color }}>
            {Math.round(metrics.overallScore * 100)}%
          </div>
          <div className={cn("maturity-badge mt-2", `maturity-${metrics.maturityLevel.level}`)}>
            {metrics.maturityLevel.name}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Controles sem Evidência</div>
          <div className="kpi-value text-amber-600">
            {Math.round((1 - metrics.evidenceReadiness) * metrics.answeredQuestions)}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            Necessitam documentação
          </div>
        </div>
      </div>

      {/* Coverage vs Maturity by Domain */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold mb-4">Cobertura vs Maturidade por Domínio</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Domínio</th>
                <th>NIST Function</th>
                <th>Cobertura</th>
                <th>Maturidade</th>
                <th>Gaps</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {metrics.domainMetrics.map(dm => {
                const status = dm.coverage < 0.5 ? 'incomplete' : 
                               dm.score < 0.5 ? 'at-risk' : 'on-track';
                return (
                  <tr key={dm.domainId}>
                    <td className="font-medium">{dm.domainName}</td>
                    <td>
                      <span className="text-xs px-2 py-1 rounded bg-muted">
                        {dm.nistFunction || '-'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${dm.coverage * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs">{Math.round(dm.coverage * 100)}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full" 
                            style={{ 
                              width: `${dm.score * 100}%`,
                              backgroundColor: dm.maturityLevel.color 
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs">{Math.round(dm.score * 100)}%</span>
                      </div>
                    </td>
                    <td className="font-mono">{dm.criticalGaps}</td>
                    <td>
                      <span className={cn(
                        "text-xs px-2 py-1 rounded",
                        status === 'incomplete' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                        status === 'at-risk' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                        'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      )}>
                        {status === 'incomplete' ? 'Incompleto' :
                         status === 'at-risk' ? 'Em Risco' : 'Adequado'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evidence Readiness by Ownership */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-elevated p-6">
          <h3 className="font-semibold mb-4">Maturidade por Responsável</h3>
          <div className="space-y-4">
            {ownershipData.map(od => (
              <div key={od.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{od.name}</span>
                  <span className="font-mono text-sm">{od.score}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${od.score}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-20">
                    {od.answered}/{od.total} resp.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-6">
          <h3 className="font-semibold mb-4">Cobertura por Framework</h3>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
            {frameworkCoverage.map(fw => (
              <div key={fw.framework} className="flex items-center justify-between">
                <span className="text-sm truncate flex-1" title={fw.framework}>{fw.framework}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {fw.answeredQuestions}/{fw.totalQuestions}
                  </span>
                  <span className="font-mono text-sm w-12 text-right">
                    {Math.round(fw.averageScore * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Framework Category Maturity */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold mb-4">Maturidade por Categoria de Framework</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Perguntas</th>
                <th>Respondidas</th>
                <th>Cobertura</th>
                <th>Maturidade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {frameworkCategoryData.map(fc => {
                const status = fc.coverage < 50 ? 'incomplete' : 
                               fc.score < 50 ? 'at-risk' : 'on-track';
                return (
                  <tr key={fc.categoryId}>
                    <td className="font-medium">{fc.name}</td>
                    <td className="font-mono">{fc.totalQuestions}</td>
                    <td className="font-mono">{fc.answeredQuestions}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${fc.coverage}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs">{fc.coverage}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full" 
                            style={{ 
                              width: `${fc.score}%`,
                              backgroundColor: fc.maturityLevel.color 
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs">{fc.score}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={cn(
                        "text-xs px-2 py-1 rounded",
                        status === 'incomplete' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                        status === 'at-risk' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                        'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      )}>
                        {status === 'incomplete' ? 'Incompleto' :
                         status === 'at-risk' ? 'Em Risco' : 'Adequado'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subcategories with Low Evidence */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold mb-4">Subcategorias com Baixa Prontidão de Evidências</h3>
        <div className="space-y-2">
          {metrics.domainMetrics
            .flatMap(dm => dm.subcategoryMetrics)
            .filter(sm => sm.answeredQuestions > 0 && sm.score < 0.7)
            .sort((a, b) => a.score - b.score)
            .slice(0, 8)
            .map(sm => (
              <div 
                key={sm.subcatId}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">{sm.subcatName}</p>
                  <p className="text-xs text-muted-foreground">
                    {sm.ownershipType || 'GRC'} · {sm.answeredQuestions}/{sm.totalQuestions} perguntas
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("criticality-badge", `criticality-${sm.criticality.toLowerCase()}`)}>
                    {sm.criticality}
                  </span>
                  <span 
                    className="font-mono text-sm"
                    style={{ color: sm.maturityLevel.color }}
                  >
                    {Math.round(sm.score * 100)}%
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
