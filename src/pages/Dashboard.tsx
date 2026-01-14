import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnswersStore } from '@/lib/stores';
import { domains, subcategories, maturityLevels } from '@/lib/dataset';
import { calculateOverallMetrics, getCriticalGaps, getFrameworkCoverage } from '@/lib/scoring';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { answers, isLoading } = useAnswersStore();
  const navigate = useNavigate();

  const metrics = useMemo(() => calculateOverallMetrics(answers), [answers]);
  const criticalGaps = useMemo(() => getCriticalGaps(answers, 0.5).slice(0, 10), [answers]);
  const frameworkCoverage = useMemo(() => getFrameworkCoverage(answers).slice(0, 8), [answers]);

  const domainChartData = metrics.domainMetrics.map(dm => ({
    name: dm.domainName.length > 20 ? dm.domainName.slice(0, 18) + '...' : dm.domainName,
    fullName: dm.domainName,
    score: Math.round(dm.score * 100),
    level: dm.maturityLevel.level,
    color: dm.maturityLevel.color,
  }));

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard de Maturidade</h1>
        {answers.size === 0 && (
          <button 
            onClick={() => navigate('/assessment')}
            className="text-sm text-primary hover:underline"
          >
            Iniciar avaliação
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="kpi-card">
          <div className="kpi-label">Score Geral</div>
          <div className="kpi-value" style={{ color: metrics.maturityLevel.color }}>
            {Math.round(metrics.overallScore * 100)}%
          </div>
          <div className={cn("maturity-badge mt-2", `maturity-${metrics.maturityLevel.level}`)}>
            Nível {metrics.maturityLevel.level}: {metrics.maturityLevel.name}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Cobertura</div>
          <div className="kpi-value">{Math.round(metrics.coverage * 100)}%</div>
          <div className="text-sm text-muted-foreground mt-2">
            {metrics.answeredQuestions} de {metrics.totalQuestions} perguntas
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Prontidão de Evidências</div>
          <div className="kpi-value">{Math.round(metrics.evidenceReadiness * 100)}%</div>
          <div className="text-sm text-muted-foreground mt-2">
            Documentação disponível
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Gaps Críticos</div>
          <div className="kpi-value text-destructive">{metrics.criticalGaps}</div>
          <div className="text-sm text-muted-foreground mt-2">
            Em subcategorias High/Critical
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Domain Scores Chart */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold mb-4">Maturidade por Domínio</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={domainChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Score']}
                  labelFormatter={(label) => domainChartData.find(d => d.name === label)?.fullName || label}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {domainChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Heatmap */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold mb-4">Mapa de Calor por Subcategoria</h3>
          <div className="grid grid-cols-6 gap-1">
            {metrics.domainMetrics.flatMap(dm => 
              dm.subcategoryMetrics.slice(0, 4).map(sm => (
                <div
                  key={sm.subcatId}
                  className="heatmap-cell aspect-square flex items-center justify-center text-xs font-medium text-white"
                  style={{ backgroundColor: sm.maturityLevel.color }}
                  title={`${sm.subcatName}: ${Math.round(sm.score * 100)}%`}
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
      </div>

      {/* Critical Gaps Table */}
      {criticalGaps.length > 0 && (
        <div className="card-elevated p-6">
          <h3 className="font-semibold mb-4">Top Gaps Críticos</h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Domínio</th>
                  <th>Subcategoria</th>
                  <th>Criticidade</th>
                  <th>Pergunta</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {criticalGaps.map(gap => (
                  <tr key={gap.questionId}>
                    <td className="whitespace-nowrap">{gap.domainName}</td>
                    <td>{gap.subcatName}</td>
                    <td>
                      <span className={cn("criticality-badge", `criticality-${gap.criticality.toLowerCase()}`)}>
                        {gap.criticality}
                      </span>
                    </td>
                    <td className="max-w-md truncate">{gap.questionText}</td>
                    <td className="font-mono">{Math.round(gap.effectiveScore * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Framework Coverage */}
      {frameworkCoverage.length > 0 && (
        <div className="card-elevated p-6">
          <h3 className="font-semibold mb-4">Cobertura por Framework</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {frameworkCoverage.map(fw => (
              <div key={fw.framework} className="p-4 bg-muted/50 rounded-lg">
                <div className="font-medium text-sm truncate">{fw.framework}</div>
                <div className="text-2xl font-bold mt-1">{Math.round(fw.averageScore * 100)}%</div>
                <div className="text-xs text-muted-foreground">
                  {fw.answeredQuestions}/{fw.totalQuestions} perguntas
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
