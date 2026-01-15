import { OverallMetrics, CriticalGap, FrameworkCoverage, RoadmapItem } from './scoring';
import { Framework } from './frameworks';

interface ReportData {
  dashboardType: 'executive' | 'grc' | 'specialist';
  metrics: OverallMetrics;
  criticalGaps: CriticalGap[];
  frameworkCoverage: FrameworkCoverage[];
  selectedFrameworks: Framework[];
  roadmap?: RoadmapItem[];
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

// Generate SVG donut chart
function generateDonutChart(value: number, color: string, label: string, size: number = 120): string {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const center = size / 2;
  
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="#e5e7eb" stroke-width="12"/>
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="12"
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" 
        transform="rotate(-90 ${center} ${center})" stroke-linecap="round"/>
      <text x="${center}" y="${center - 5}" text-anchor="middle" font-size="24" font-weight="bold" fill="${color}">${value}%</text>
      <text x="${center}" y="${center + 15}" text-anchor="middle" font-size="10" fill="#6b7280">${label}</text>
    </svg>
  `;
}

// Generate SVG horizontal bar chart
function generateHorizontalBarChart(data: { name: string; value: number; color: string }[], width: number = 400): string {
  const barHeight = 28;
  const gap = 8;
  const labelWidth = 150;
  const height = data.length * (barHeight + gap);
  const maxBarWidth = width - labelWidth - 60;
  
  const bars = data.map((item, index) => {
    const y = index * (barHeight + gap);
    const barWidth = (item.value / 100) * maxBarWidth;
    return `
      <g transform="translate(0, ${y})">
        <text x="0" y="${barHeight / 2 + 4}" font-size="11" fill="#374151">${item.name.length > 20 ? item.name.slice(0, 18) + '...' : item.name}</text>
        <rect x="${labelWidth}" y="4" width="${maxBarWidth}" height="${barHeight - 8}" fill="#e5e7eb" rx="4"/>
        <rect x="${labelWidth}" y="4" width="${barWidth}" height="${barHeight - 8}" fill="${item.color}" rx="4"/>
        <text x="${labelWidth + maxBarWidth + 8}" y="${barHeight / 2 + 4}" font-size="11" font-weight="600" fill="${item.color}">${item.value}%</text>
      </g>
    `;
  }).join('');
  
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${bars}</svg>`;
}

// Generate SVG pie chart for gap distribution
function generatePieChart(data: { label: string; value: number; color: string }[], size: number = 200): string {
  const center = size / 2;
  const radius = (size - 40) / 2;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  
  if (total === 0) {
    return `<svg width="${size}" height="${size}"><text x="${center}" y="${center}" text-anchor="middle" fill="#6b7280">Sem dados</text></svg>`;
  }
  
  let currentAngle = -90;
  const paths = data.filter(d => d.value > 0).map(item => {
    const percentage = item.value / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    return `<path d="M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${item.color}"/>`;
  }).join('');
  
  const legend = data.filter(d => d.value > 0).map((item, i) => `
    <g transform="translate(${size + 10}, ${i * 20})">
      <rect width="12" height="12" fill="${item.color}" rx="2"/>
      <text x="18" y="10" font-size="11" fill="#374151">${item.label}: ${item.value}</text>
    </g>
  `).join('');
  
  return `<svg width="${size + 120}" height="${Math.max(size, data.length * 20)}" viewBox="0 0 ${size + 120} ${Math.max(size, data.length * 20)}">${paths}${legend}</svg>`;
}

// Generate NIST function radar-like visualization
function generateNistFunctionChart(metrics: OverallMetrics): string {
  const nistData = [
    { func: 'GOVERN', label: 'Governar', color: '#3b82f6' },
    { func: 'MAP', label: 'Mapear', color: '#8b5cf6' },
    { func: 'MEASURE', label: 'Medir', color: '#06b6d4' },
    { func: 'MANAGE', label: 'Gerenciar', color: '#10b981' }
  ];
  
  const functionScores = nistData.map(n => {
    const domains = metrics.domainMetrics.filter(dm => dm.nistFunction === n.func);
    if (domains.length === 0) return { ...n, score: 0 };
    const avgScore = domains.reduce((sum, d) => sum + d.score, 0) / domains.length;
    return { ...n, score: Math.round(avgScore * 100) };
  });
  
  const barData = functionScores.map(f => ({
    name: f.label,
    value: f.score,
    color: f.color
  }));
  
  return generateHorizontalBarChart(barData, 350);
}

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

  // Prepare chart data
  const domainChartData = metrics.domainMetrics.map(dm => ({
    name: dm.domainName,
    value: Math.round(dm.score * 100),
    color: getMaturityColor(dm.maturityLevel.level)
  }));

  const gapDistribution = [
    { label: 'Crítico', value: criticalGaps.filter(g => g.criticality === 'Critical').length, color: '#dc2626' },
    { label: 'Alto', value: criticalGaps.filter(g => g.criticality === 'High').length, color: '#ea580c' },
    { label: 'Médio', value: criticalGaps.filter(g => g.criticality === 'Medium').length, color: '#ca8a04' },
    { label: 'Baixo', value: criticalGaps.filter(g => g.criticality === 'Low').length, color: '#16a34a' }
  ];

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${getDashboardTitle(dashboardType)} - ${formattedDate}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
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
    
    .header h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; }
    .header .meta { font-size: 0.875rem; opacity: 0.9; }
    
    .content { padding: 2rem; }
    
    .section { margin-bottom: 2.5rem; page-break-inside: avoid; }
    
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
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }
    
    .kpi-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.25rem;
      text-align: center;
    }
    
    .kpi-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      margin-bottom: 0.75rem;
    }
    
    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 2rem;
    }
    
    .chart-container {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.5rem;
    }
    
    .chart-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 1rem;
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
    
    .table th, .table td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .table th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-fill { height: 100%; border-radius: 4px; }
    
    .gap-item {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 0.75rem;
      page-break-inside: avoid;
    }
    
    .gap-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
    }
    
    .gap-question { font-weight: 500; color: #1f2937; flex: 1; }
    .gap-meta { font-size: 0.75rem; color: #6b7280; }
    
    .summary-box {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      text-align: center;
    }
    
    .summary-item h3 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }
    
    .summary-item p {
      font-size: 0.875rem;
      color: #4b5563;
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
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
      .section { page-break-inside: avoid; }
      .gap-item { break-inside: avoid; }
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
      <!-- Executive Summary -->
      <div class="summary-box">
        <div class="summary-grid">
          <div class="summary-item">
            <h3 style="color: ${getMaturityColor(metrics.maturityLevel.level)}">${Math.round(metrics.overallScore * 100)}%</h3>
            <p>Score Geral - Nível ${metrics.maturityLevel.level}: ${metrics.maturityLevel.name}</p>
          </div>
          <div class="summary-item">
            <h3 style="color: #1e40af">${Math.round(metrics.coverage * 100)}%</h3>
            <p>Cobertura (${metrics.answeredQuestions}/${metrics.totalQuestions} questões)</p>
          </div>
          <div class="summary-item">
            <h3 style="color: #dc2626">${criticalGaps.length}</h3>
            <p>Gaps Identificados</p>
          </div>
        </div>
      </div>
      
      <!-- Visual KPIs with Donut Charts -->
      <div class="section">
        <h2 class="section-title">Indicadores de Maturidade</h2>
        <div class="kpi-grid">
          <div class="kpi-card">
            ${generateDonutChart(Math.round(metrics.overallScore * 100), getMaturityColor(metrics.maturityLevel.level), 'Score')}
          </div>
          <div class="kpi-card">
            ${generateDonutChart(Math.round(metrics.coverage * 100), '#1e40af', 'Cobertura')}
          </div>
          <div class="kpi-card">
            ${generateDonutChart(Math.round(metrics.evidenceReadiness * 100), '#059669', 'Evidências')}
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Distribuição de Gaps</div>
            <div style="margin-top: 0.5rem;">
              ${gapDistribution.map(g => `
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                  <div style="width: 12px; height: 12px; border-radius: 2px; background: ${g.color}"></div>
                  <span style="font-size: 0.75rem;">${g.label}: ${g.value}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Charts Row -->
      <div class="charts-row">
        <div class="chart-container">
          <div class="chart-title">Score por Domínio</div>
          ${generateHorizontalBarChart(domainChartData, 450)}
        </div>
        <div class="chart-container">
          <div class="chart-title">Funções NIST AI RMF</div>
          ${generateNistFunctionChart(metrics)}
        </div>
      </div>
      
      <!-- Gap Distribution Chart -->
      ${criticalGaps.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Distribuição de Riscos</h2>
        <div style="display: flex; justify-content: center; padding: 1rem;">
          ${generatePieChart(gapDistribution, 180)}
        </div>
      </div>
      ` : ''}
      
      <!-- Domain Metrics Table -->
      <div class="section">
        <h2 class="section-title">Detalhamento por Domínio</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Domínio</th>
              <th>Score</th>
              <th>Cobertura</th>
              <th>Gaps</th>
              <th>Nível</th>
              <th>Progresso</th>
            </tr>
          </thead>
          <tbody>
            ${metrics.domainMetrics.map(dm => `
              <tr>
                <td><strong>${dm.domainName}</strong></td>
                <td style="color: ${getMaturityColor(dm.maturityLevel.level)}; font-weight: 600;">${Math.round(dm.score * 100)}%</td>
                <td>${Math.round(dm.coverage * 100)}%</td>
                <td>${dm.criticalGaps}</td>
                <td>
                  <span class="badge" style="background: ${getMaturityColor(dm.maturityLevel.level)}; color: white;">
                    ${dm.maturityLevel.name}
                  </span>
                </td>
                <td style="width: 150px;">
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.round(dm.score * 100)}%; background: ${getMaturityColor(dm.maturityLevel.level)}"></div>
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
              <th>Progresso</th>
            </tr>
          </thead>
          <tbody>
            ${frameworkCoverage.map(fc => `
              <tr>
                <td><strong>${fc.framework}</strong></td>
                <td style="font-weight: 600;">${Math.round(fc.averageScore * 100)}%</td>
                <td>${Math.round(fc.coverage * 100)}%</td>
                <td>${fc.answeredQuestions}/${fc.totalQuestions}</td>
                <td style="width: 150px;">
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.round(fc.coverage * 100)}%; background: #3b82f6"></div>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      <!-- Strategic Roadmap -->
      ${data.roadmap && data.roadmap.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Roadmap Estratégico</h2>
        <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 1.5rem;">Ações prioritárias para os próximos 90 dias</p>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem;">
          ${['immediate', 'short', 'medium'].map(priority => {
            const items = data.roadmap!.filter(r => r.priority === priority);
            const config: Record<string, { label: string; color: string; bgColor: string }> = {
              immediate: { label: '0-30 dias', color: '#dc2626', bgColor: '#fef2f2' },
              short: { label: '30-60 dias', color: '#d97706', bgColor: '#fffbeb' },
              medium: { label: '60-90 dias', color: '#2563eb', bgColor: '#eff6ff' }
            };
            const cfg = config[priority];
            return `
              <div style="background: ${cfg.bgColor}; border-left: 4px solid ${cfg.color}; border-radius: 8px; padding: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background: ${cfg.color};"></div>
                  <h4 style="font-weight: 600; font-size: 0.875rem; color: #374151;">${cfg.label}</h4>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                  ${items.length > 0 ? items.map(item => `
                    <div style="font-size: 0.75rem;">
                      <p style="font-weight: 500; color: #1f2937; margin-bottom: 0.25rem;">${item.action}</p>
                      <p style="color: #6b7280;">${item.domain} · ${item.ownershipType}</p>
                    </div>
                  `).join('') : '<p style="font-size: 0.75rem; color: #9ca3af;">Nenhuma ação pendente</p>'}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Critical Gaps -->
      ${criticalGaps.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Gaps Críticos (${criticalGaps.length})</h2>
        ${criticalGaps.map((gap, index) => `
          <div class="gap-item">
            <div class="gap-header">
              <div style="display: flex; align-items: flex-start; gap: 0.75rem; flex: 1;">
                <span style="font-size: 0.875rem; font-weight: 700; color: #9ca3af; min-width: 1.5rem;">${index + 1}</span>
                <div class="gap-question">${gap.questionText}</div>
              </div>
              <span class="badge" style="background: ${getCriticalityColor(gap.criticality)}; color: white; margin-left: 1rem; white-space: nowrap;">
                ${gap.criticality}
              </span>
            </div>
            <div class="gap-meta" style="margin-left: 2.25rem;">
              <strong>${gap.domainName}</strong> → ${gap.subcatName} | Resposta: ${gap.response || 'Não respondido'} | Score: ${Math.round(gap.effectiveScore * 100)}%
            </div>
          </div>
        `).join('')}
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>Relatório gerado automaticamente pelo Sistema de Avaliação de Maturidade em Segurança de IA</p>
      <p style="margin-top: 0.5rem;">${formattedDate}</p>
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
