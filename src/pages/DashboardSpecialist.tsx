import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnswersStore } from '@/lib/stores';
import { domains, maturityLevels } from '@/lib/dataset';
import { calculateOverallMetrics, getCriticalGaps, getFrameworkCoverage } from '@/lib/scoring';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';
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

export default function DashboardSpecialist() {
  const { answers, isLoading } = useAnswersStore();
  const navigate = useNavigate();

  const metrics = useMemo(() => calculateOverallMetrics(answers), [answers]);
  const criticalGaps = useMemo(() => getCriticalGaps(answers, 0.5), [answers]);
  const frameworkCoverage = useMemo(() => getFrameworkCoverage(answers), [answers]);

  const domainChartData = metrics.domainMetrics.map(dm => ({
    name: dm.domainName.length > 15 ? dm.domainName.slice(0, 13) + '...' : dm.domainName,
    fullName: dm.domainName,
    score: Math.round(dm.score * 100),
    coverage: Math.round(dm.coverage * 100),
    level: dm.maturityLevel.level,
    color: dm.maturityLevel.color,
    nistFunction: dm.nistFunction,
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
        <h1 className="text-2xl font-bold">Dashboard Especialista</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Arquiteto / Engenheiro - Detalhes técnicos e implementação
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

      {/* Framework Category Cards */}
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
    </div>
  );
}
