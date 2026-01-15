import { OverallMetrics, CriticalGap, FrameworkCoverage } from './scoring';
import { Framework } from './frameworks';

interface ReportData {
  dashboardType: 'executive' | 'grc' | 'specialist';
  metrics: OverallMetrics;
  criticalGaps: CriticalGap[];
  frameworkCoverage: FrameworkCoverage[];
  selectedFrameworks: Framework[];
  generatedAt: Date;
}

const getMaturityColor = (level: number): string => {
  switch (level) {
    case 0: return '#ef4444';
    case 1: return '#f97316';
    case 2: return '#eab308';
    case 3: return '#22c55e';
    default: return '#6b7280';
  }
};

const getCriticalityColor = (criticality: string): string => {
  switch (criticality) {
    case 'Critical': return '#dc2626';
    case 'High': return '#ea580c';
    case 'Medium': return '#ca8a04';
    case 'Low': return '#16a34a';
    default: return '#6b7280';
  }
};

const getDashboardTitle = (type: string): string => {
  switch (type) {
    case 'executive': return 'Resumo Executivo - Maturidade em Segurança de IA';
    case 'grc': return 'Dashboard GRC - Governança, Riscos e Compliance';
    case 'specialist': return 'Dashboard Especialista - Detalhes Técnicos';
    default: return 'Relatório de Maturidade';
  }
};

export function generateHtmlReport(data: ReportData): string {
  const { dashboardType, metrics, criticalGaps, frameworkCoverage, selectedFrameworks, generatedAt } = data;
  
  const formattedDate = generatedAt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const selectedFrameworkNames = selectedFrameworks.length > 0 
    ? selectedFrameworks.map(f => f.shortName).join(', ')
    : 'Todos os frameworks habilitados';

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${getDashboardTitle(dashboardType)} - ${formattedDate}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
      padding: 2rem;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 2rem;
    }
    
    .header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    
    .header .meta {
      font-size: 0.875rem;
      opacity: 0.9;
    }
    
    .content {
      padding: 2rem;
    }
    
    .section {
      margin-bottom: 2rem;
    }
    
    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    
    .kpi-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.25rem;
    }
    
    .kpi-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }
    
    .kpi-value {
      font-size: 2rem;
      font-weight: 700;
    }
    
    .kpi-meta {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.25rem;
    }
    
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    
    .table th,
    .table td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .table th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    
    .table tr:hover {
      background: #f9fafb;
    }
    
    .domain-row {
      background: #f3f4f6;
    }
    
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      border-radius: 4px;
    }
    
    .frameworks-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    
    .framework-badge {
      background: #1e40af;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
    }
    
    .gap-item {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 0.75rem;
    }
    
    .gap-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
    }
    
    .gap-question {
      font-weight: 500;
      color: #1f2937;
      flex: 1;
    }
    
    .gap-meta {
      font-size: 0.75rem;
      color: #6b7280;
    }
    
    .footer {
      background: #f9fafb;
      padding: 1rem 2rem;
      text-align: center;
      font-size: 0.75rem;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
      }
      
      .gap-item {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${getDashboardTitle(dashboardType)}</h1>
      <div class="meta">
        <div>Gerado em: ${formattedDate}</div>
        <div>Frameworks: ${selectedFrameworkNames}</div>
      </div>
    </div>
    
    <div class="content">
      <!-- KPIs -->
      <div class="section">
        <h2 class="section-title">Indicadores Principais</h2>
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Score Geral</div>
            <div class="kpi-value" style="color: ${getMaturityColor(metrics.maturityLevel.level)}">
              ${Math.round(metrics.overallScore * 100)}%
            </div>
            <div class="kpi-meta">
              <span class="badge" style="background: ${getMaturityColor(metrics.maturityLevel.level)}; color: white;">
                Nível ${metrics.maturityLevel.level}: ${metrics.maturityLevel.name}
              </span>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-label">Gaps Críticos</div>
            <div class="kpi-value" style="color: #dc2626">${criticalGaps.length}</div>
            <div class="kpi-meta">
              ${criticalGaps.filter(g => g.criticality === 'Critical').length} críticos, 
              ${criticalGaps.filter(g => g.criticality === 'High').length} altos
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-label">Cobertura</div>
            <div class="kpi-value" style="color: #1e40af">${Math.round(metrics.coverage * 100)}%</div>
            <div class="kpi-meta">${metrics.answeredQuestions} de ${metrics.totalQuestions} questões</div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-label">Prontidão de Evidências</div>
            <div class="kpi-value" style="color: #059669">${Math.round(metrics.evidenceReadiness * 100)}%</div>
            <div class="kpi-meta">Documentação e evidências</div>
          </div>
        </div>
      </div>
      
      <!-- Domain Metrics -->
      <div class="section">
        <h2 class="section-title">Métricas por Domínio</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Domínio</th>
              <th>Score</th>
              <th>Cobertura</th>
              <th>Gaps</th>
              <th>Progresso</th>
            </tr>
          </thead>
          <tbody>
            ${metrics.domainMetrics.map(dm => `
              <tr>
                <td><strong>${dm.domainName}</strong></td>
                <td style="color: ${getMaturityColor(dm.maturityLevel.level)}">${Math.round(dm.score * 100)}%</td>
                <td>${Math.round(dm.coverage * 100)}%</td>
                <td>${dm.criticalGaps}</td>
                <td>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.round(dm.coverage * 100)}%; background: ${getMaturityColor(dm.maturityLevel.level)}"></div>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <!-- Framework Coverage -->
      ${frameworkCoverage.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Cobertura por Framework</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Framework</th>
              <th>Score Médio</th>
              <th>Cobertura</th>
              <th>Questões</th>
            </tr>
          </thead>
          <tbody>
            ${frameworkCoverage.map(fc => `
              <tr>
                <td><strong>${fc.framework}</strong></td>
                <td>${Math.round(fc.averageScore * 100)}%</td>
                <td>${Math.round(fc.coverage * 100)}%</td>
                <td>${fc.answeredQuestions}/${fc.totalQuestions}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      <!-- Critical Gaps -->
      ${criticalGaps.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Gaps Críticos (${criticalGaps.length})</h2>
        ${criticalGaps.slice(0, 20).map(gap => `
          <div class="gap-item">
            <div class="gap-header">
              <div class="gap-question">${gap.questionText}</div>
              <span class="badge" style="background: ${getCriticalityColor(gap.criticality)}; color: white; margin-left: 1rem;">
                ${gap.criticality}
              </span>
            </div>
            <div class="gap-meta">
              ${gap.domainName} → ${gap.subcatName} | Resposta: ${gap.response || 'Não respondido'}
            </div>
          </div>
        `).join('')}
        ${criticalGaps.length > 20 ? `<p style="color: #6b7280; font-size: 0.875rem;">... e mais ${criticalGaps.length - 20} gaps</p>` : ''}
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      Relatório gerado automaticamente pelo Sistema de Avaliação de Maturidade em Segurança de IA
    </div>
  </div>
</body>
</html>
`;

  return html;
}

export function downloadHtmlReport(data: ReportData): void {
  const html = generateHtmlReport(data);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `relatorio-${data.dashboardType}-${dateStr}.html`;
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
