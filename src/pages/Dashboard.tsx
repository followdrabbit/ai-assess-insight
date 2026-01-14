import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnswersStore } from '@/lib/stores';
import { domains, subcategories, maturityLevels, nistAiRmfFunctions, frameworkCategories, frameworkCategoryIds, FrameworkCategoryId } from '@/lib/dataset';
import { calculateOverallMetrics, getCriticalGaps, getFrameworkCoverage, generateRoadmap } from '@/lib/scoring';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { cn } from '@/lib/utils';
import { 
  PersonaSelector, 
  PersonaType, 
  MaturityScoreHelp, 
  CoverageHelp, 
  EvidenceReadinessHelp, 
  CriticalGapsHelp,
  NistFunctionHelp 
} from '@/components/HelpTooltip';

// NIST AI RMF function display names
const nistFunctionLabels: Record<string, string> = {
  GOVERN: 'Governar',
  MAP: 'Mapear',
  MEASURE: 'Medir',
  MANAGE: 'Gerenciar',
};

const nistFunctionColors: Record<string, string> = {
  GOVERN: 'hsl(var(--chart-1))',
  MAP: 'hsl(var(--chart-2))',
  MEASURE: 'hsl(var(--chart-3))',
  MANAGE: 'hsl(var(--chart-4))',
};

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

export default function Dashboard() {
  const { answers, isLoading } = useAnswersStore();
  const navigate = useNavigate();
  const [persona, setPersona] = useState<PersonaType>('executive');

  const metrics = useMemo(() => calculateOverallMetrics(answers), [answers]);
  const criticalGaps = useMemo(() => getCriticalGaps(answers, 0.5).slice(0, 10), [answers]);
  const frameworkCoverage = useMemo(() => getFrameworkCoverage(answers).slice(0, 8), [answers]);
  const roadmap = useMemo(() => generateRoadmap(answers, 5), [answers]);

  // Data for charts
  const domainChartData = metrics.domainMetrics.map(dm => ({
    name: dm.domainName.length > 15 ? dm.domainName.slice(0, 13) + '...' : dm.domainName,
    fullName: dm.domainName,
    score: Math.round(dm.score * 100),
    coverage: Math.round(dm.coverage * 100),
    level: dm.maturityLevel.level,
    color: dm.maturityLevel.color,
    nistFunction: dm.nistFunction,
  }));

  const nistFunctionData = metrics.nistFunctionMetrics.map(nf => ({
    function: nistFunctionLabels[nf.function] || nf.function,
    score: Math.round(nf.score * 100),
    fullMark: 100,
    color: nistFunctionColors[nf.function],
  }));

  // Framework category data for charts
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

  const ownershipData = metrics.ownershipMetrics.map(om => ({
    name: om.ownershipType,
    score: Math.round(om.score * 100),
    coverage: Math.round(om.coverage * 100),
    total: om.totalQuestions,
    answered: om.answeredQuestions,
  }));

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Persona Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Maturidade</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Selecione sua visão para personalizar os indicadores
          </p>
        </div>
        <PersonaSelector value={persona} onChange={setPersona} />
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

      {/* Executive View */}
      {persona === 'executive' && (
        <>
          {/* Executive KPI Cards */}
          <div className="stats-grid">
            <div className="kpi-card">
              <div className="flex items-center justify-between mb-1">
                <div className="kpi-label">Score Geral</div>
                <MaturityScoreHelp />
              </div>
              <div className="kpi-value" style={{ color: metrics.maturityLevel.color }}>
                {Math.round(metrics.overallScore * 100)}%
              </div>
              <div className={cn("maturity-badge mt-2", `maturity-${metrics.maturityLevel.level}`)}>
                Nível {metrics.maturityLevel.level}: {metrics.maturityLevel.name}
              </div>
            </div>

            <div className="kpi-card">
              <div className="flex items-center justify-between mb-1">
                <div className="kpi-label">Gaps Críticos</div>
                <CriticalGapsHelp />
              </div>
              <div className="kpi-value text-destructive">{metrics.criticalGaps}</div>
              <div className="text-sm text-muted-foreground mt-2">
                Requerem ação prioritária
              </div>
            </div>

            <div className="kpi-card">
              <div className="flex items-center justify-between mb-1">
                <div className="kpi-label">Cobertura</div>
                <CoverageHelp />
              </div>
              <div className="kpi-value">{Math.round(metrics.coverage * 100)}%</div>
              <div className="text-sm text-muted-foreground mt-2">
                {metrics.answeredQuestions} de {metrics.totalQuestions} perguntas
              </div>
            </div>

            <div className="kpi-card">
              <div className="flex items-center justify-between mb-1">
                <div className="kpi-label">Prontidão de Evidências</div>
                <EvidenceReadinessHelp />
              </div>
              <div className="kpi-value">{Math.round(metrics.evidenceReadiness * 100)}%</div>
              <div className="text-sm text-muted-foreground mt-2">
                Documentação disponível
              </div>
            </div>
          </div>

          {/* NIST AI RMF and Domain Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* NIST AI RMF Radar */}
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Maturidade por Função NIST AI RMF</h3>
                <NistFunctionHelp />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={nistFunctionData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="function" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                    <Tooltip formatter={(value: number) => [`${value}%`, 'Score']} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Domain Bar Chart */}
            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">Maturidade por Domínio (Top 5)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={domainChartData.slice(0, 5)} 
                    layout="vertical" 
                    margin={{ left: 10, right: 20 }}
                  >
                    <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value: number) => [`${value}%`, 'Score']}
                      labelFormatter={(label) => domainChartData.find(d => d.name === label)?.fullName || label}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {domainChartData.slice(0, 5).map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Framework Category Maturity */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4">Maturidade por Categoria de Framework</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Visão consolidada do alinhamento com frameworks de referência agrupados por categoria
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {frameworkCategoryData.map(fc => (
                <div key={fc.categoryId} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{fc.name}</span>
                    <span 
                      className="text-lg font-bold"
                      style={{ color: fc.maturityLevel.color }}
                    >
                      {fc.score}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full transition-all" 
                      style={{ 
                        width: `${fc.score}%`,
                        backgroundColor: fc.maturityLevel.color 
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{fc.answeredQuestions}/{fc.totalQuestions} perguntas</span>
                    <span>{fc.coverage}% cobertura</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Roadmap */}
          {roadmap.length > 0 && (
            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">Roadmap Estratégico (30/60/90 dias)</h3>
              <div className="space-y-3">
                {roadmap.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "flex items-start gap-4 p-3 rounded-lg border-l-4",
                      item.priority === 'immediate' ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20' :
                      item.priority === 'short' ? 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/20' :
                      'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20'
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded",
                          item.priority === 'immediate' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                          item.priority === 'short' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        )}>
                          {item.timeframe}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.domain}</span>
                      </div>
                      <p className="font-medium text-sm">{item.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.impact}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.ownershipType}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Critical Gaps - Executive Summary */}
          {criticalGaps.length > 0 && (
            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">Top 5 Gaps Críticos</h3>
              <div className="space-y-2">
                {criticalGaps.slice(0, 5).map((gap, idx) => (
                  <div 
                    key={gap.questionId}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground">{idx + 1}</span>
                      <div>
                        <p className="font-medium text-sm">{gap.subcatName}</p>
                        <p className="text-xs text-muted-foreground">{gap.domainName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("criticality-badge", `criticality-${gap.criticality.toLowerCase()}`)}>
                        {gap.criticality}
                      </span>
                      <span className="font-mono text-sm">{Math.round(gap.effectiveScore * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* GRC View */}
      {persona === 'grc' && (
        <>
          {/* GRC KPI Cards - Focus on Coverage and Evidence */}
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

          {/* Framework Category Maturity - GRC View */}
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
        </>
      )}

      {/* Specialist View */}
      {persona === 'specialist' && (
        <>
          {/* Specialist KPIs */}
          <div className="stats-grid">
            <div className="kpi-card">
              <div className="kpi-label">Total de Perguntas</div>
              <div className="kpi-value">{metrics.totalQuestions}</div>
              <div className="text-sm text-muted-foreground mt-2">
                Em {domains.length} domínios
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-label">Respondidas</div>
              <div className="kpi-value">{metrics.answeredQuestions}</div>
              <div className="text-sm text-muted-foreground mt-2">
                {Math.round(metrics.coverage * 100)}% de cobertura
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-label">Controles Ausentes</div>
              <div className="kpi-value text-destructive">
                {criticalGaps.filter(g => g.response === 'Não' || g.response === 'Não respondido').length}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Resposta "Não" ou sem resposta
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-label">Controles Parciais</div>
              <div className="kpi-value text-amber-600">
                {Array.from(answers.values()).filter(a => a.response === 'Parcial').length}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Implementação incompleta
              </div>
            </div>
          </div>

          {/* Full Domain Breakdown */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4">Detalhamento por Domínio</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={domainChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `${value}%`, 
                      name === 'score' ? 'Maturidade' : 'Cobertura'
                    ]}
                    labelFormatter={(label) => domainChartData.find(d => d.name === label)?.fullName || label}
                  />
                  <Bar dataKey="score" name="score" radius={[0, 4, 4, 0]}>
                    {domainChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subcategory Heatmap */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4">Mapa de Calor por Subcategoria</h3>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1">
              {metrics.domainMetrics.flatMap(dm => 
                dm.subcategoryMetrics.map(sm => (
                  <div
                    key={sm.subcatId}
                    className="heatmap-cell aspect-square flex items-center justify-center text-xs font-medium text-white cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: sm.maturityLevel.color }}
                    title={`${sm.subcatName}: ${Math.round(sm.score * 100)}% (${sm.criticality})`}
                    onClick={() => navigate('/assessment')}
                  >
                    {Math.round(sm.score * 100)}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs">
              {maturityLevels.map(level => (
                <div key={level.level} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: level.color }} />
                  <span>{level.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Gap List */}
          {criticalGaps.length > 0 && (
            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">Lista de Gaps Técnicos</h3>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Subcategoria</th>
                      <th>Pergunta</th>
                      <th>Status</th>
                      <th>Criticidade</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalGaps.map(gap => (
                      <tr key={gap.questionId}>
                        <td className="font-mono text-xs whitespace-nowrap">{gap.questionId}</td>
                        <td className="whitespace-nowrap">{gap.subcatName}</td>
                        <td className="max-w-md">
                          <p className="truncate">{gap.questionText}</p>
                        </td>
                        <td>
                          <span className={cn(
                            "text-xs px-2 py-1 rounded",
                            gap.response === 'Não respondido' ? 'bg-gray-100 text-gray-700' :
                            gap.response === 'Não' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          )}>
                            {gap.response}
                          </span>
                        </td>
                        <td>
                          <span className={cn("criticality-badge", `criticality-${gap.criticality.toLowerCase()}`)}>
                            {gap.criticality}
                          </span>
                        </td>
                        <td className="font-mono">{Math.round(gap.effectiveScore * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Framework Category Cards - Specialist View */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4">Maturidade por Categoria de Framework</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Alinhamento com frameworks de referência para instituições financeiras
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {frameworkCategoryData.map(fc => (
                <div key={fc.categoryId} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{fc.name}</span>
                    <span 
                      className="text-lg font-bold"
                      style={{ color: fc.maturityLevel.color }}
                    >
                      {fc.score}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full transition-all" 
                      style={{ 
                        width: `${fc.score}%`,
                        backgroundColor: fc.maturityLevel.color 
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{fc.answeredQuestions}/{fc.totalQuestions} perguntas</span>
                    <span>{fc.coverage}% cobertura</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Individual Framework Coverage */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4">Cobertura Detalhada por Framework</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {frameworkCoverage.map(fw => (
                <div key={fw.framework} className="p-4 bg-muted/50 rounded-lg">
                  <div className="font-medium text-sm truncate" title={fw.framework}>
                    {fw.framework}
                  </div>
                  <div className="text-2xl font-bold mt-1">{Math.round(fw.averageScore * 100)}%</div>
                  <div className="text-xs text-muted-foreground">
                    {fw.answeredQuestions}/{fw.totalQuestions} perguntas
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${fw.coverage * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
