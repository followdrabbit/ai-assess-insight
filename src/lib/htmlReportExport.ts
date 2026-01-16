import { OverallMetrics, CriticalGap, FrameworkCoverage, RoadmapItem } from './scoring';
import { Framework } from './frameworks';

interface ReportData {
  dashboardType: 'executive' | 'grc' | 'specialist';
  metrics: OverallMetrics;
  criticalGaps: CriticalGap[];
  frameworkCoverage: FrameworkCoverage[];
  selectedFrameworks: Framework[];
  roadmap?: RoadmapItem[];
  frameworkCategoryData?: {
    categoryId: string;
    name: string;
    score: number;
    coverage: number;
    totalQuestions: number;
    answeredQuestions: number;
    maturityLevel: { level: number; name: string; color: string };
  }[];
  nistFunctionData?: { function: string; functionId: string; score: number }[];
  riskDistribution?: { name: string; value: number; color: string }[];
  coverageStats?: { total: number; answered: number; pending: number; coverage: number };
  // GRC specific
  ownershipData?: { name: string; score: number; coverage: number; total: number; answered: number }[];
  quickStats?: {
    totalDomains?: number;
    incompleteCount?: number;
    atRiskCount?: number;
    onTrackCount?: number;
    criticalGapsCount?: number;
    frameworksCount?: number;
    // Specialist
    totalGaps?: number;
    criticalCount?: number;
    highCount?: number;
    notRespondedCount?: number;
    noCount?: number;
    partialCount?: number;
  };
  // Specialist specific
  responseDistribution?: { name: string; value: number; color: string }[];
  heatmapData?: { subcatId: string; subcatName: string; score: number; criticality: string; domainId: string }[];
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

const getDashboardSubtitle = (type: string): string => {
  switch (type) {
    case 'executive': return 'Visão consolidada para tomada de decisão estratégica';
    case 'grc': return 'Acompanhamento detalhado de conformidade e responsabilidades';
    case 'specialist': return 'Análise técnica aprofundada de vulnerabilidades e gaps';
    default: return '';
  }
};

// Generate SVG donut chart
function generateDonutChart(value: number, color: string, label: string, sublabel?: string, size: number = 100): string {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const center = size / 2;
  
  return `
    <div style="display: flex; flex-direction: column; align-items: center;">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="#e5e7eb" stroke-width="10"/>
        <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="10"
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" 
          transform="rotate(-90 ${center} ${center})" stroke-linecap="round"/>
        <text x="${center}" y="${center + 6}" text-anchor="middle" font-size="20" font-weight="bold" fill="${color}">${value}%</text>
      </svg>
      <div style="text-align: center; margin-top: 0.5rem;">
        <div style="font-size: 0.75rem; font-weight: 600; color: #374151;">${label}</div>
        ${sublabel ? `<div style="font-size: 0.625rem; color: #6b7280;">${sublabel}</div>` : ''}
      </div>
    </div>
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

// Generate NIST function chart
function generateNistFunctionChart(nistData: { function: string; score: number }[]): string {
  const barData = nistData.map((n, i) => ({
    name: n.function,
    value: n.score,
    color: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'][i % 4]
  }));
  
  return generateHorizontalBarChart(barData, 350);
}

// Generate base styles
function getBaseStyles(): string {
  return `
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
      padding: 1.5rem 2rem;
    }
    
    .header h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.25rem; }
    .header p { font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem; }
    .header .meta { font-size: 0.75rem; opacity: 0.8; }
    
    .content { padding: 1.5rem 2rem; }
    
    .section { margin-bottom: 2rem; page-break-inside: avoid; }
    
    .section-title {
      font-size: 1rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 1rem;
    }
    
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    
    .kpi-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1rem;
      position: relative;
      overflow: hidden;
    }
    
    .kpi-card .corner {
      position: absolute;
      top: 0;
      right: 0;
      width: 40px;
      height: 40px;
      border-bottom-left-radius: 100%;
    }
    
    .kpi-label {
      font-size: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }
    
    .kpi-value {
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1;
    }
    
    .kpi-sublabel {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.5rem;
    }
    
    .kpi-footer {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e5e7eb;
      font-size: 0.625rem;
      color: #9ca3af;
    }
    
    .maturity-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 500;
      margin-top: 0.5rem;
    }
    
    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    
    .charts-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    
    .chart-container {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1rem;
    }
    
    .chart-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 1rem;
    }
    
    .framework-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }
    
    .framework-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1rem;
    }
    
    .category-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 0.75rem;
    }
    
    .category-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 0.75rem;
    }
    
    .roadmap-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    
    .roadmap-column {
      border-radius: 8px;
      padding: 1rem;
      border-left: 4px solid;
    }
    
    .roadmap-immediate { background: #fef2f2; border-color: #dc2626; }
    .roadmap-short { background: #fffbeb; border-color: #d97706; }
    .roadmap-medium { background: #eff6ff; border-color: #2563eb; }
    
    .roadmap-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    
    .roadmap-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    
    .gap-item {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    
    .gap-number {
      font-size: 1rem;
      font-weight: 700;
      color: #9ca3af;
      min-width: 1.5rem;
    }
    
    .gap-content {
      flex: 1;
      min-width: 0;
    }
    
    .gap-question {
      font-size: 0.875rem;
      font-weight: 500;
      color: #1f2937;
      margin-bottom: 0.25rem;
    }
    
    .gap-meta {
      font-size: 0.75rem;
      color: #6b7280;
    }
    
    .gap-badges {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }
    
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 600;
    }
    
    .badge-critical { background: #dc2626; color: white; }
    .badge-high { background: #ea580c; color: white; }
    .badge-medium { background: #ca8a04; color: white; }
    .badge-low { background: #16a34a; color: white; }
    
    .progress-bar {
      width: 100%;
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
    }
    
    .progress-fill { height: 100%; border-radius: 3px; }
    
    .domain-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 0.75rem;
    }
    
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 500;
    }
    
    .status-incomplete { background: #fef3c7; color: #92400e; }
    .status-at-risk { background: #fee2e2; color: #991b1b; }
    .status-on-track { background: #d1fae5; color: #065f46; }
    
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.75rem;
    }
    
    .table th, .table td {
      padding: 0.5rem 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .table th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    
    .heatmap-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 0.5rem;
    }
    
    .heatmap-cell {
      padding: 0.5rem;
      border-radius: 4px;
      text-align: center;
      font-size: 0.625rem;
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
      body { background: white; padding: 0.5rem; }
      .container { box-shadow: none; }
      .section { page-break-inside: avoid; }
      .gap-item { break-inside: avoid; }
      .domain-card { break-inside: avoid; }
    }
  `;
}

// Generate Executive Dashboard content
function generateExecutiveContent(data: ReportData): string {
  const { 
    metrics, 
    criticalGaps, 
    frameworkCoverage, 
    roadmap,
    frameworkCategoryData,
    nistFunctionData,
    riskDistribution,
    coverageStats 
  } = data;

  const effectiveCoverageStats = coverageStats || {
    total: metrics.totalQuestions,
    answered: metrics.answeredQuestions,
    pending: metrics.totalQuestions - metrics.answeredQuestions,
    coverage: metrics.coverage
  };

  const effectiveNistData = nistFunctionData || metrics.nistFunctionMetrics?.map(nf => ({
    function: nf.function === 'GOVERN' ? 'Governar' : 
              nf.function === 'MAP' ? 'Mapear' : 
              nf.function === 'MEASURE' ? 'Medir' : 'Gerenciar',
    functionId: nf.function,
    score: Math.round(nf.score * 100)
  })) || [];

  const effectiveRiskDistribution = riskDistribution || [
    { name: 'Crítico', value: criticalGaps.filter(g => g.criticality === 'Critical').length, color: '#dc2626' },
    { name: 'Alto', value: criticalGaps.filter(g => g.criticality === 'High').length, color: '#ea580c' },
    { name: 'Médio', value: criticalGaps.filter(g => g.criticality === 'Medium').length, color: '#ca8a04' },
    { name: 'Baixo', value: criticalGaps.filter(g => g.criticality === 'Low').length, color: '#16a34a' }
  ].filter(d => d.value > 0);

  const domainChartData = metrics.domainMetrics.slice(0, 6).map(dm => ({
    name: dm.domainName.length > 18 ? dm.domainName.slice(0, 16) + '...' : dm.domainName,
    value: Math.round(dm.score * 100),
    color: getMaturityColor(dm.maturityLevel.level)
  }));

  return `
    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="corner" style="background: ${getMaturityColor(metrics.maturityLevel.level)}20;"></div>
        <div class="kpi-label">Score Geral</div>
        <div class="kpi-value" style="color: ${getMaturityColor(metrics.maturityLevel.level)};">
          ${Math.round(metrics.overallScore * 100)}%
        </div>
        <div class="maturity-badge" style="background: ${getMaturityColor(metrics.maturityLevel.level)}20; color: ${getMaturityColor(metrics.maturityLevel.level)};">
          Nível ${metrics.maturityLevel.level}: ${metrics.maturityLevel.name}
        </div>
        <div class="kpi-footer">Meta recomendada: 70%+</div>
      </div>
      
      <div class="kpi-card">
        <div class="corner" style="background: #dc262620;"></div>
        <div class="kpi-label">Gaps Críticos</div>
        <div class="kpi-value" style="color: #dc2626;">${criticalGaps.length}</div>
        <div class="kpi-sublabel">Requerem ação prioritária</div>
        <div class="kpi-footer">
          <span style="color: ${criticalGaps.length === 0 ? '#16a34a' : criticalGaps.length <= 5 ? '#d97706' : '#dc2626'};">
            ${criticalGaps.length === 0 ? 'Excelente' : criticalGaps.length <= 5 ? 'Atenção necessária' : 'Ação imediata'}
          </span>
        </div>
      </div>
      
      <div class="kpi-card">
        <div class="corner" style="background: #3b82f620;"></div>
        <div class="kpi-label">Cobertura</div>
        <div class="kpi-value" style="color: #1e40af;">
          ${Math.round(effectiveCoverageStats.coverage * 100)}%
        </div>
        <div class="kpi-sublabel">${effectiveCoverageStats.answered} de ${effectiveCoverageStats.total} perguntas</div>
        <div class="kpi-footer">${effectiveCoverageStats.pending} perguntas pendentes</div>
      </div>
      
      <div class="kpi-card">
        <div class="corner" style="background: #16a34a20;"></div>
        <div class="kpi-label">Prontidão de Evidências</div>
        <div class="kpi-value" style="color: #059669;">
          ${Math.round(metrics.evidenceReadiness * 100)}%
        </div>
        <div class="kpi-sublabel">Documentação disponível</div>
        <div class="kpi-footer">Preparação para auditoria</div>
      </div>
    </div>
    
    <!-- Charts Row -->
    <div class="charts-row">
      <div class="chart-container">
        <div class="chart-title">Funções NIST AI RMF</div>
        ${generateNistFunctionChart(effectiveNistData)}
        <div style="margin-top: 0.75rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
          ${effectiveNistData.map((nf) => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: #f3f4f6; border-radius: 4px;">
              <span style="font-size: 0.75rem;">${nf.function}</span>
              <span style="font-size: 0.75rem; font-weight: 600; font-family: monospace;">${nf.score}%</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="chart-container">
        <div class="chart-title">Maturidade por Domínio</div>
        ${generateHorizontalBarChart(domainChartData, 300)}
      </div>
      
      <div class="chart-container">
        <div class="chart-title">Distribuição de Riscos</div>
        ${effectiveRiskDistribution.length > 0 ? `
          <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem;">
            ${effectiveRiskDistribution.map(r => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: ${r.color}10; border: 1px solid ${r.color}30; border-radius: 4px;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <div style="width: 10px; height: 10px; border-radius: 2px; background: ${r.color};"></div>
                  <span style="font-size: 0.75rem;">${r.name}</span>
                </div>
                <span style="font-size: 0.875rem; font-weight: 600; font-family: monospace;">${r.value}</span>
              </div>
            `).join('')}
          </div>
        ` : '<div style="padding: 2rem; text-align: center; color: #9ca3af;">Nenhum gap identificado</div>'}
      </div>
    </div>
    
    <!-- Framework Coverage -->
    ${frameworkCoverage.length > 0 ? `
    <div class="section">
      <div class="section-title">Cobertura por Framework</div>
      <div class="framework-grid">
        ${frameworkCoverage.map(fc => `
          <div class="framework-card">
            <div style="font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${fc.framework}">
              ${fc.framework}
            </div>
            <div style="display: flex; align-items: baseline; gap: 0.25rem; margin-bottom: 0.5rem;">
              <span style="font-size: 1.5rem; font-weight: 700;">${Math.round(fc.averageScore * 100)}%</span>
              <span style="font-size: 0.625rem; color: #6b7280;">score</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.round(fc.coverage * 100)}%; background: #3b82f6;"></div>
            </div>
            <div style="font-size: 0.625rem; color: #6b7280; margin-top: 0.5rem;">
              ${fc.answeredQuestions}/${fc.totalQuestions} perguntas respondidas
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
    
    <!-- Framework Category Maturity -->
    ${frameworkCategoryData && frameworkCategoryData.length > 0 ? `
    <div class="section">
      <div class="section-title">Maturidade por Categoria de Framework</div>
      <div class="category-grid">
        ${frameworkCategoryData.map(fc => `
          <div class="category-card">
            <div style="font-size: 0.75rem; font-weight: 500; margin-bottom: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${fc.name}">
              ${fc.name}
            </div>
            <div style="font-size: 1.5rem; font-weight: 700; color: ${fc.maturityLevel.color}; margin-bottom: 0.5rem;">
              ${fc.score}%
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${fc.score}%; background: ${fc.maturityLevel.color};"></div>
            </div>
            <div style="font-size: 0.625rem; color: #6b7280; margin-top: 0.5rem;">
              ${fc.answeredQuestions}/${fc.totalQuestions} perguntas
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
    
    <!-- Strategic Roadmap -->
    ${roadmap && roadmap.length > 0 ? `
    <div class="section">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <div>
          <div class="section-title" style="margin-bottom: 0.25rem;">Roadmap Estratégico</div>
          <div style="font-size: 0.75rem; color: #6b7280;">Ações prioritárias para os próximos 90 dias</div>
        </div>
        <div style="display: flex; gap: 1rem; font-size: 0.75rem;">
          <span style="display: flex; align-items: center; gap: 0.25rem;"><div style="width: 8px; height: 8px; border-radius: 50%; background: #dc2626;"></div> 0-30 dias</span>
          <span style="display: flex; align-items: center; gap: 0.25rem;"><div style="width: 8px; height: 8px; border-radius: 50%; background: #d97706;"></div> 30-60 dias</span>
          <span style="display: flex; align-items: center; gap: 0.25rem;"><div style="width: 8px; height: 8px; border-radius: 50%; background: #2563eb;"></div> 60-90 dias</span>
        </div>
      </div>
      <div class="roadmap-grid">
        ${(['immediate', 'short', 'medium'] as const).map(priority => {
          const items = roadmap.filter(r => r.priority === priority);
          const config: Record<string, { label: string; dotColor: string; className: string }> = {
            immediate: { label: '0-30 dias', dotColor: '#dc2626', className: 'roadmap-immediate' },
            short: { label: '30-60 dias', dotColor: '#d97706', className: 'roadmap-short' },
            medium: { label: '60-90 dias', dotColor: '#2563eb', className: 'roadmap-medium' }
          };
          const cfg = config[priority];
          return `
            <div class="roadmap-column ${cfg.className}">
              <div class="roadmap-title">
                <div class="roadmap-dot" style="background: ${cfg.dotColor};"></div>
                <span style="font-weight: 600; font-size: 0.875rem;">${cfg.label}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${items.length > 0 ? items.map(item => `
                  <div style="font-size: 0.75rem;">
                    <div style="font-weight: 500; color: #1f2937;">${item.action}</div>
                    <div style="color: #6b7280; margin-top: 0.25rem;">${item.domain} · ${item.ownershipType}</div>
                  </div>
                `).join('') : '<div style="font-size: 0.75rem; color: #9ca3af;">Nenhuma ação pendente</div>'}
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
      <div class="section-title">Gaps Críticos (${criticalGaps.length})</div>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        ${criticalGaps.map((gap, index) => `
          <div class="gap-item">
            <div class="gap-number">${index + 1}</div>
            <div class="gap-content">
              <div class="gap-question">${gap.questionText}</div>
              <div class="gap-meta">${gap.subcatName} · ${gap.domainName}</div>
            </div>
            <div class="gap-badges">
              ${gap.nistFunction ? `<span style="font-size: 0.625rem; background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 4px;">${
                gap.nistFunction === 'GOVERN' ? 'Governar' : 
                gap.nistFunction === 'MAP' ? 'Mapear' : 
                gap.nistFunction === 'MEASURE' ? 'Medir' : 'Gerenciar'
              }</span>` : ''}
              <span class="badge badge-${gap.criticality.toLowerCase()}">${gap.criticality}</span>
              <span style="font-family: monospace; font-size: 0.875rem; min-width: 3rem; text-align: right;">${Math.round(gap.effectiveScore * 100)}%</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
  `;
}

// Generate GRC Dashboard content
function generateGRCContent(data: ReportData): string {
  const { 
    metrics, 
    criticalGaps, 
    frameworkCoverage,
    frameworkCategoryData,
    ownershipData,
    quickStats
  } = data;

  const getStatus = (coverage: number, score: number) => {
    if (coverage < 0.5) return { status: 'incomplete', label: 'Incompleto', class: 'status-incomplete' };
    if (score < 0.5) return { status: 'at-risk', label: 'Em Risco', class: 'status-at-risk' };
    return { status: 'on-track', label: 'No Caminho', class: 'status-on-track' };
  };

  return `
    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="corner" style="background: ${getMaturityColor(metrics.maturityLevel.level)}20;"></div>
        <div class="kpi-label">Score Geral</div>
        <div class="kpi-value" style="color: ${getMaturityColor(metrics.maturityLevel.level)};">
          ${Math.round(metrics.overallScore * 100)}%
        </div>
        <div class="maturity-badge" style="background: ${getMaturityColor(metrics.maturityLevel.level)}20; color: ${getMaturityColor(metrics.maturityLevel.level)};">
          Nível ${metrics.maturityLevel.level}: ${metrics.maturityLevel.name}
        </div>
      </div>
      
      <div class="kpi-card">
        <div class="corner" style="background: #3b82f620;"></div>
        <div class="kpi-label">Cobertura</div>
        <div class="kpi-value" style="color: #1e40af;">
          ${Math.round(metrics.coverage * 100)}%
        </div>
        <div class="kpi-sublabel">${metrics.answeredQuestions} de ${metrics.totalQuestions} perguntas</div>
      </div>
      
      <div class="kpi-card">
        <div class="corner" style="background: #16a34a20;"></div>
        <div class="kpi-label">Evidências</div>
        <div class="kpi-value" style="color: #059669;">
          ${Math.round(metrics.evidenceReadiness * 100)}%
        </div>
        <div class="kpi-sublabel">Documentação disponível</div>
      </div>
      
      <div class="kpi-card">
        <div class="corner" style="background: #dc262620;"></div>
        <div class="kpi-label">Gaps Críticos</div>
        <div class="kpi-value" style="color: #dc2626;">${criticalGaps.length}</div>
        <div class="kpi-sublabel">Requerem atenção</div>
      </div>
    </div>
    
    <!-- Quick Stats -->
    ${quickStats ? `
    <div class="section">
      <div class="section-title">Visão Geral de Status</div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
        <div style="background: #d1fae5; border-radius: 8px; padding: 1rem; text-align: center;">
          <div style="font-size: 1.5rem; font-weight: 700; color: #065f46;">${quickStats.onTrackCount || 0}</div>
          <div style="font-size: 0.75rem; color: #065f46;">Domínios no Caminho</div>
        </div>
        <div style="background: #fef3c7; border-radius: 8px; padding: 1rem; text-align: center;">
          <div style="font-size: 1.5rem; font-weight: 700; color: #92400e;">${quickStats.incompleteCount || 0}</div>
          <div style="font-size: 0.75rem; color: #92400e;">Domínios Incompletos</div>
        </div>
        <div style="background: #fee2e2; border-radius: 8px; padding: 1rem; text-align: center;">
          <div style="font-size: 1.5rem; font-weight: 700; color: #991b1b;">${quickStats.atRiskCount || 0}</div>
          <div style="font-size: 0.75rem; color: #991b1b;">Domínios em Risco</div>
        </div>
      </div>
    </div>
    ` : ''}
    
    <!-- Ownership Distribution -->
    ${ownershipData && ownershipData.length > 0 ? `
    <div class="section">
      <div class="section-title">Distribuição por Responsabilidade</div>
      <div class="framework-grid">
        ${ownershipData.map(od => `
          <div class="framework-card">
            <div style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">${od.name}</div>
            <div style="display: flex; align-items: baseline; gap: 0.25rem; margin-bottom: 0.5rem;">
              <span style="font-size: 1.5rem; font-weight: 700; color: ${getMaturityColor(od.score >= 70 ? 3 : od.score >= 50 ? 2 : od.score >= 25 ? 1 : 0)};">${od.score}%</span>
              <span style="font-size: 0.625rem; color: #6b7280;">score</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${od.coverage}%; background: #3b82f6;"></div>
            </div>
            <div style="font-size: 0.625rem; color: #6b7280; margin-top: 0.5rem;">
              ${od.answered}/${od.total} perguntas (${od.coverage}% cobertura)
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
    
    <!-- Domain Metrics -->
    <div class="section">
      <div class="section-title">Detalhamento por Domínio</div>
      ${metrics.domainMetrics.map(dm => {
        const statusInfo = getStatus(dm.coverage, dm.score);
        return `
        <div class="domain-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div>
              <div style="font-size: 0.875rem; font-weight: 600;">${dm.domainName}</div>
              <div style="font-size: 0.625rem; color: #6b7280; margin-top: 0.25rem;">
                ${dm.answeredQuestions}/${dm.totalQuestions} perguntas · ${dm.criticalGaps} gaps
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="status-badge ${statusInfo.class}">${statusInfo.label}</span>
              <span style="font-size: 1.25rem; font-weight: 700; color: ${getMaturityColor(dm.maturityLevel.level)};">
                ${Math.round(dm.score * 100)}%
              </span>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <div style="font-size: 0.625rem; color: #6b7280; margin-bottom: 0.25rem;">Score</div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.round(dm.score * 100)}%; background: ${getMaturityColor(dm.maturityLevel.level)};"></div>
              </div>
            </div>
            <div>
              <div style="font-size: 0.625rem; color: #6b7280; margin-bottom: 0.25rem;">Cobertura</div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.round(dm.coverage * 100)}%; background: #3b82f6;"></div>
              </div>
            </div>
          </div>
        </div>
      `;}).join('')}
    </div>
    
    <!-- Framework Coverage -->
    ${frameworkCoverage.length > 0 ? `
    <div class="section">
      <div class="section-title">Cobertura por Framework</div>
      <table class="table">
        <thead>
          <tr>
            <th>Framework</th>
            <th>Score</th>
            <th>Cobertura</th>
            <th>Questões</th>
            <th>Progresso</th>
          </tr>
        </thead>
        <tbody>
          ${frameworkCoverage.map(fc => `
            <tr>
              <td style="font-weight: 500;">${fc.framework}</td>
              <td style="font-weight: 600;">${Math.round(fc.averageScore * 100)}%</td>
              <td>${Math.round(fc.coverage * 100)}%</td>
              <td>${fc.answeredQuestions}/${fc.totalQuestions}</td>
              <td style="width: 120px;">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${Math.round(fc.coverage * 100)}%; background: #3b82f6;"></div>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
    
    <!-- Framework Category -->
    ${frameworkCategoryData && frameworkCategoryData.length > 0 ? `
    <div class="section">
      <div class="section-title">Maturidade por Categoria</div>
      <div class="category-grid">
        ${frameworkCategoryData.map(fc => `
          <div class="category-card">
            <div style="font-size: 0.75rem; font-weight: 500; margin-bottom: 0.5rem;" title="${fc.name}">
              ${fc.name}
            </div>
            <div style="font-size: 1.25rem; font-weight: 700; color: ${fc.maturityLevel.color};">
              ${fc.score}%
            </div>
            <div class="progress-bar" style="margin-top: 0.5rem;">
              <div class="progress-fill" style="width: ${fc.score}%; background: ${fc.maturityLevel.color};"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
    
    <!-- Critical Gaps -->
    ${criticalGaps.length > 0 ? `
    <div class="section">
      <div class="section-title">Gaps Críticos (${criticalGaps.length})</div>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        ${criticalGaps.map((gap, index) => `
          <div class="gap-item">
            <div class="gap-number">${index + 1}</div>
            <div class="gap-content">
              <div class="gap-question">${gap.questionText}</div>
              <div class="gap-meta">${gap.subcatName} · ${gap.domainName} · ${gap.ownershipType || 'N/A'}</div>
            </div>
            <div class="gap-badges">
              <span class="badge badge-${gap.criticality.toLowerCase()}">${gap.criticality}</span>
              <span style="font-family: monospace; font-size: 0.875rem;">${Math.round(gap.effectiveScore * 100)}%</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
  `;
}

// Generate Specialist Dashboard content
function generateSpecialistContent(data: ReportData): string {
  const { 
    metrics, 
    criticalGaps,
    frameworkCoverage,
    frameworkCategoryData,
    responseDistribution,
    heatmapData,
    quickStats
  } = data;

  const criticalityDistribution = [
    { name: 'Crítico', value: criticalGaps.filter(g => g.criticality === 'Critical').length, color: '#dc2626' },
    { name: 'Alto', value: criticalGaps.filter(g => g.criticality === 'High').length, color: '#ea580c' },
    { name: 'Médio', value: criticalGaps.filter(g => g.criticality === 'Medium').length, color: '#ca8a04' },
    { name: 'Baixo', value: criticalGaps.filter(g => g.criticality === 'Low').length, color: '#16a34a' }
  ].filter(d => d.value > 0);

  const domainChartData = metrics.domainMetrics.map(dm => ({
    name: dm.domainName.length > 15 ? dm.domainName.slice(0, 13) + '...' : dm.domainName,
    value: Math.round(dm.score * 100),
    color: getMaturityColor(dm.maturityLevel.level)
  }));

  return `
    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="corner" style="background: #dc262620;"></div>
        <div class="kpi-label">Total de Gaps</div>
        <div class="kpi-value" style="color: #dc2626;">${criticalGaps.length}</div>
        <div class="kpi-sublabel">Vulnerabilidades identificadas</div>
      </div>
      
      <div class="kpi-card">
        <div class="corner" style="background: #dc262620;"></div>
        <div class="kpi-label">Críticos</div>
        <div class="kpi-value" style="color: #dc2626;">${quickStats?.criticalCount || criticalGaps.filter(g => g.criticality === 'Critical').length}</div>
        <div class="kpi-sublabel">Ação imediata necessária</div>
      </div>
      
      <div class="kpi-card">
        <div class="corner" style="background: #ea580c20;"></div>
        <div class="kpi-label">Alto Risco</div>
        <div class="kpi-value" style="color: #ea580c;">${quickStats?.highCount || criticalGaps.filter(g => g.criticality === 'High').length}</div>
        <div class="kpi-sublabel">Prioridade alta</div>
      </div>
      
      <div class="kpi-card">
        <div class="corner" style="background: #6b728020;"></div>
        <div class="kpi-label">Não Respondidos</div>
        <div class="kpi-value" style="color: #6b7280;">${quickStats?.notRespondedCount || criticalGaps.filter(g => g.response === 'Não respondido').length}</div>
        <div class="kpi-sublabel">Aguardando avaliação</div>
      </div>
    </div>
    
    <!-- Charts -->
    <div class="charts-row-2">
      <div class="chart-container">
        <div class="chart-title">Score por Domínio</div>
        ${generateHorizontalBarChart(domainChartData, 450)}
      </div>
      
      <div class="chart-container">
        <div class="chart-title">Distribuição de Respostas</div>
        ${responseDistribution && responseDistribution.length > 0 ? `
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${responseDistribution.map(r => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: ${r.color}15; border: 1px solid ${r.color}40; border-radius: 4px;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <div style="width: 12px; height: 12px; border-radius: 2px; background: ${r.color};"></div>
                  <span style="font-size: 0.875rem;">${r.name}</span>
                </div>
                <span style="font-size: 1rem; font-weight: 600;">${r.value}</span>
              </div>
            `).join('')}
          </div>
        ` : '<div style="padding: 2rem; text-align: center; color: #9ca3af;">Sem dados</div>'}
      </div>
    </div>
    
    <!-- Criticality Distribution -->
    <div class="section">
      <div class="section-title">Distribuição por Criticidade</div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
        ${criticalityDistribution.map(c => `
          <div style="background: ${c.color}15; border: 2px solid ${c.color}; border-radius: 8px; padding: 1rem; text-align: center;">
            <div style="font-size: 1.75rem; font-weight: 700; color: ${c.color};">${c.value}</div>
            <div style="font-size: 0.75rem; color: ${c.color}; font-weight: 500;">${c.name}</div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Heatmap -->
    ${heatmapData && heatmapData.length > 0 ? `
    <div class="section">
      <div class="section-title">Mapa de Calor - Subcategorias</div>
      <div class="heatmap-grid">
        ${heatmapData.slice(0, 30).map(cell => {
          const score = Math.round(cell.score * 100);
          const bgColor = score >= 70 ? '#22c55e' : score >= 50 ? '#eab308' : score >= 25 ? '#f97316' : '#ef4444';
          return `
            <div class="heatmap-cell" style="background: ${bgColor}20; border: 1px solid ${bgColor};">
              <div style="font-weight: 600; color: ${bgColor};">${score}%</div>
              <div style="color: #374151; margin-top: 0.25rem;" title="${cell.subcatName}">${cell.subcatName.length > 15 ? cell.subcatName.slice(0, 13) + '...' : cell.subcatName}</div>
            </div>
          `;
        }).join('')}
      </div>
      ${heatmapData.length > 30 ? `<div style="text-align: center; margin-top: 0.5rem; font-size: 0.75rem; color: #6b7280;">E mais ${heatmapData.length - 30} subcategorias...</div>` : ''}
    </div>
    ` : ''}
    
    <!-- Framework Coverage -->
    ${frameworkCoverage.length > 0 ? `
    <div class="section">
      <div class="section-title">Cobertura por Framework</div>
      <div class="framework-grid">
        ${frameworkCoverage.map(fc => `
          <div class="framework-card">
            <div style="font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem;">${fc.framework}</div>
            <div style="font-size: 1.5rem; font-weight: 700;">${Math.round(fc.averageScore * 100)}%</div>
            <div class="progress-bar" style="margin-top: 0.5rem;">
              <div class="progress-fill" style="width: ${Math.round(fc.coverage * 100)}%; background: #3b82f6;"></div>
            </div>
            <div style="font-size: 0.625rem; color: #6b7280; margin-top: 0.5rem;">
              ${fc.answeredQuestions}/${fc.totalQuestions} perguntas
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
    
    <!-- Framework Category -->
    ${frameworkCategoryData && frameworkCategoryData.length > 0 ? `
    <div class="section">
      <div class="section-title">Maturidade por Categoria</div>
      <div class="category-grid">
        ${frameworkCategoryData.map(fc => `
          <div class="category-card">
            <div style="font-size: 0.75rem; font-weight: 500; margin-bottom: 0.5rem;">${fc.name}</div>
            <div style="font-size: 1.25rem; font-weight: 700; color: ${fc.maturityLevel.color};">${fc.score}%</div>
            <div class="progress-bar" style="margin-top: 0.5rem;">
              <div class="progress-fill" style="width: ${fc.score}%; background: ${fc.maturityLevel.color};"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
    
    <!-- All Gaps -->
    ${criticalGaps.length > 0 ? `
    <div class="section">
      <div class="section-title">Todos os Gaps (${criticalGaps.length})</div>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        ${criticalGaps.map((gap, index) => `
          <div class="gap-item">
            <div class="gap-number">${index + 1}</div>
            <div class="gap-content">
              <div class="gap-question">${gap.questionText}</div>
              <div class="gap-meta">${gap.subcatName} · ${gap.domainName} · Resposta: ${gap.response || 'N/A'}</div>
            </div>
            <div class="gap-badges">
              <span class="badge badge-${gap.criticality.toLowerCase()}">${gap.criticality}</span>
              <span style="font-family: monospace; font-size: 0.875rem;">${Math.round(gap.effectiveScore * 100)}%</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
  `;
}

export function generateHtmlReport(data: ReportData): string {
  const { dashboardType, selectedFrameworks, generatedAt } = data;
  
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

  let content = '';
  switch (dashboardType) {
    case 'executive':
      content = generateExecutiveContent(data);
      break;
    case 'grc':
      content = generateGRCContent(data);
      break;
    case 'specialist':
      content = generateSpecialistContent(data);
      break;
  }

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TrustLayer | ${getDashboardTitle(dashboardType)} - ${formattedDate}</title>
  <style>${getBaseStyles()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 0.875rem; color: #64748b; margin-bottom: 0.5rem; font-weight: 500;">TrustLayer</div>
      <h1>${getDashboardTitle(dashboardType)}</h1>
      <p>${getDashboardSubtitle(dashboardType)}</p>
      <div class="meta">
        Gerado em: ${formattedDate} | Frameworks: ${selectedFrameworkNames}
      </div>
    </div>
    
    <div class="content">
      ${content}
    </div>
    
    <div class="footer">
      TrustLayer — Plataforma de Governança de Segurança · Relatório gerado em ${formattedDate}
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
