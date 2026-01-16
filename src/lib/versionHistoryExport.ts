/**
 * Version History Export
 * 
 * Generates HTML/PDF reports of question version history for audit documentation
 */

import { QuestionVersion, VersionAnnotation, compareVersions, CHANGE_TYPE_LABELS, VERSION_TAG_OPTIONS } from './questionVersioning';

interface ExportOptions {
  questionId: string;
  questionText: string;
  versions: QuestionVersion[];
  includeAnnotations?: boolean;
  includeChangeDiffs?: boolean;
  includeTags?: boolean;
  exportDate?: Date;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function generateVersionDiffHtml(oldVersion: QuestionVersion, newVersion: QuestionVersion): string {
  const diffs = compareVersions(oldVersion, newVersion);
  
  if (diffs.length === 0) {
    return '<p class="no-changes">Nenhuma alteração detectada</p>';
  }

  return `
    <table class="diff-table">
      <thead>
        <tr>
          <th>Campo</th>
          <th>Valor Anterior</th>
          <th>Novo Valor</th>
        </tr>
      </thead>
      <tbody>
        ${diffs.map(diff => `
          <tr>
            <td class="field-name">${escapeHtml(diff.label)}</td>
            <td class="old-value">${escapeHtml(diff.oldValue) || '<em>vazio</em>'}</td>
            <td class="new-value">${escapeHtml(diff.newValue) || '<em>vazio</em>'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function generateAnnotationsHtml(annotations: VersionAnnotation[]): string {
  if (!annotations || annotations.length === 0) {
    return '<p class="no-annotations">Nenhuma anotação</p>';
  }

  return `
    <div class="annotations-list">
      ${annotations.map(annotation => `
        <div class="annotation">
          <div class="annotation-header">
            <span class="annotation-date">${formatDate(annotation.createdAt)}</span>
            ${annotation.author ? `<span class="annotation-author">por ${escapeHtml(annotation.author)}</span>` : ''}
          </div>
          <div class="annotation-text">${escapeHtml(annotation.text)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function generateTagsHtml(tags: string[]): string {
  if (!tags || tags.length === 0) {
    return '<span class="no-tags">Nenhuma tag</span>';
  }

  return `
    <div class="tags-list">
      ${tags.map(tagId => {
        const option = VERSION_TAG_OPTIONS.find(t => t.id === tagId);
        return `<span class="tag tag-${tagId}">${option?.label || tagId}</span>`;
      }).join('')}
    </div>
  `;
}

function getChangeTypeClass(changeType: string): string {
  switch (changeType) {
    case 'create': return 'change-create';
    case 'update': return 'change-update';
    case 'revert': return 'change-revert';
    default: return '';
  }
}

export function generateVersionHistoryHtml(options: ExportOptions): string {
  const {
    questionId,
    questionText,
    versions,
    includeAnnotations = true,
    includeChangeDiffs = true,
    includeTags = true,
    exportDate = new Date()
  } = options;

  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const totalAnnotations = versions.reduce((sum, v) => sum + (v.annotations?.length || 0), 0);

  const styles = `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #1a1a1a;
        background: #fff;
        padding: 40px;
        max-width: 900px;
        margin: 0 auto;
      }
      
      .header {
        border-bottom: 3px solid #2563eb;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      
      .header h1 {
        font-size: 24px;
        color: #1e40af;
        margin-bottom: 8px;
      }
      
      .header .subtitle {
        font-size: 14px;
        color: #6b7280;
      }
      
      .meta-info {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        background: #f8fafc;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 30px;
      }
      
      .meta-item {
        font-size: 13px;
      }
      
      .meta-item .label {
        color: #6b7280;
        font-weight: 500;
      }
      
      .meta-item .value {
        color: #1a1a1a;
        font-weight: 600;
      }
      
      .question-text {
        background: #eff6ff;
        border-left: 4px solid #2563eb;
        padding: 16px 20px;
        margin-bottom: 30px;
        font-size: 14px;
      }
      
      .section-title {
        font-size: 18px;
        color: #1e40af;
        margin-bottom: 20px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .version-card {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        margin-bottom: 20px;
        overflow: hidden;
        page-break-inside: avoid;
      }
      
      .version-header {
        background: #f8fafc;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .version-number {
        font-weight: 700;
        font-size: 16px;
        color: #1a1a1a;
      }
      
      .version-badges {
        display: flex;
        gap: 8px;
      }
      
      .badge {
        font-size: 11px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 4px;
        text-transform: uppercase;
      }
      
      .badge-current {
        background: #2563eb;
        color: white;
      }
      
      .change-create {
        background: #dcfce7;
        color: #166534;
      }
      
      .change-update {
        background: #dbeafe;
        color: #1e40af;
      }
      
      .change-revert {
        background: #fed7aa;
        color: #9a3412;
      }
      
      .version-body {
        padding: 20px;
      }
      
      .version-meta {
        font-size: 12px;
        color: #6b7280;
        margin-bottom: 12px;
      }
      
      .version-summary {
        font-size: 13px;
        color: #4b5563;
        font-style: italic;
        margin-bottom: 16px;
      }
      
      .version-details {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        font-size: 12px;
        margin-bottom: 16px;
      }
      
      .detail-item .detail-label {
        color: #6b7280;
      }
      
      .detail-item .detail-value {
        color: #1a1a1a;
      }
      
      .diff-section, .annotations-section {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
      }
      
      .diff-section h4, .annotations-section h4 {
        font-size: 13px;
        font-weight: 600;
        color: #4b5563;
        margin-bottom: 12px;
      }
      
      .diff-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      
      .diff-table th, .diff-table td {
        padding: 8px 12px;
        text-align: left;
        border: 1px solid #e5e7eb;
      }
      
      .diff-table th {
        background: #f8fafc;
        font-weight: 600;
        color: #4b5563;
      }
      
      .diff-table .field-name {
        font-weight: 500;
        width: 25%;
      }
      
      .diff-table .old-value {
        background: #fef2f2;
        color: #991b1b;
        text-decoration: line-through;
      }
      
      .diff-table .new-value {
        background: #f0fdf4;
        color: #166534;
      }
      
      .no-changes, .no-annotations, .no-tags {
        font-size: 12px;
        color: #9ca3af;
        font-style: italic;
      }
      
      .tags-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      
      .tag {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 4px;
        border: 1px solid;
      }
      
      .tag-approved {
        background: #dcfce7;
        color: #166534;
        border-color: #86efac;
      }
      
      .tag-reviewed {
        background: #dbeafe;
        color: #1e40af;
        border-color: #93c5fd;
      }
      
      .tag-baseline {
        background: #f3e8ff;
        color: #7e22ce;
        border-color: #c4b5fd;
      }
      
      .tag-draft {
        background: #fef9c3;
        color: #a16207;
        border-color: #fde047;
      }
      
      .tag-deprecated {
        background: #fee2e2;
        color: #991b1b;
        border-color: #fca5a5;
      }
      
      .tag-audit {
        background: #ffedd5;
        color: #9a3412;
        border-color: #fdba74;
      }
      
      .tag-compliance {
        background: #ccfbf1;
        color: #0f766e;
        border-color: #5eead4;
      }
      
      .tags-section {
        margin-top: 12px;
      }
      
      .tags-section h4 {
        font-size: 13px;
        font-weight: 600;
        color: #4b5563;
        margin-bottom: 8px;
      }
      
      .annotations-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .annotation {
        background: #fefce8;
        border: 1px solid #fef08a;
        border-radius: 6px;
        padding: 12px;
      }
      
      .annotation-header {
        font-size: 11px;
        color: #6b7280;
        margin-bottom: 6px;
      }
      
      .annotation-author {
        margin-left: 8px;
      }
      
      .annotation-text {
        font-size: 13px;
        color: #1a1a1a;
        white-space: pre-wrap;
      }
      
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
        font-size: 11px;
        color: #9ca3af;
        text-align: center;
      }
      
      @media print {
        body {
          padding: 20px;
        }
        
        .version-card {
          page-break-inside: avoid;
        }
      }
    </style>
  `;

  const versionsHtml = sortedVersions.map((version, index) => {
    const isLatest = index === 0;
    const previousVersion = sortedVersions[index + 1];
    
    return `
      <div class="version-card">
        <div class="version-header">
          <span class="version-number">Versão ${version.versionNumber}</span>
          <div class="version-badges">
            ${isLatest ? '<span class="badge badge-current">Atual</span>' : ''}
            <span class="badge ${getChangeTypeClass(version.changeType)}">${CHANGE_TYPE_LABELS[version.changeType]}</span>
          </div>
        </div>
        <div class="version-body">
          <div class="version-meta">
            ${formatDate(version.createdAt)}
            ${version.changedBy ? ` • por ${escapeHtml(version.changedBy)}` : ''}
          </div>
          
          ${version.changeSummary ? `
            <div class="version-summary">${escapeHtml(version.changeSummary)}</div>
          ` : ''}
          
          <div class="version-details">
            <div class="detail-item">
              <span class="detail-label">Área: </span>
              <span class="detail-value">${escapeHtml(version.domainId)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Criticidade: </span>
              <span class="detail-value">${escapeHtml(version.criticality || 'Não definida')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Responsável: </span>
              <span class="detail-value">${escapeHtml(version.ownershipType || 'Não definido')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Frameworks: </span>
              <span class="detail-value">${version.frameworks?.length ? escapeHtml(version.frameworks.join(', ')) : 'Nenhum'}</span>
            </div>
          </div>
          
          ${includeTags ? `
            <div class="tags-section">
              <h4>Tags</h4>
              ${generateTagsHtml(version.tags)}
            </div>
          ` : ''}
          
          ${includeChangeDiffs && previousVersion ? `
            <div class="diff-section">
              <h4>Alterações em relação à versão ${previousVersion.versionNumber}</h4>
              ${generateVersionDiffHtml(previousVersion, version)}
            </div>
          ` : ''}
          
          ${includeAnnotations ? `
            <div class="annotations-section">
              <h4>Anotações (${version.annotations?.length || 0})</h4>
              ${generateAnnotationsHtml(version.annotations)}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TrustLayer | Histórico de Versões - ${escapeHtml(questionId)}</title>
      ${styles}
    </head>
    <body>
      <div class="header">
        <div style="font-size: 0.875rem; color: #64748b; margin-bottom: 0.5rem; font-weight: 500;">TrustLayer</div>
        <h1>📋 Relatório de Histórico de Versões</h1>
        <p class="subtitle">Documentação de auditoria para rastreabilidade de alterações</p>
      </div>
      
      <div class="meta-info">
        <div class="meta-item">
          <span class="label">ID da Pergunta: </span>
          <span class="value">${escapeHtml(questionId)}</span>
        </div>
        <div class="meta-item">
          <span class="label">Data de Exportação: </span>
          <span class="value">${formatDate(exportDate.toISOString())}</span>
        </div>
        <div class="meta-item">
          <span class="label">Total de Versões: </span>
          <span class="value">${versions.length}</span>
        </div>
        <div class="meta-item">
          <span class="label">Total de Anotações: </span>
          <span class="value">${totalAnnotations}</span>
        </div>
      </div>
      
      <div class="question-text">
        <strong>Texto da Pergunta (versão atual):</strong><br>
        ${escapeHtml(questionText)}
      </div>
      
      <h2 class="section-title">Histórico de Versões</h2>
      
      ${versionsHtml}
      
      <div class="footer">
        TrustLayer — Plataforma de Governança de Segurança<br>
        Relatório gerado em ${formatDate(exportDate.toISOString())}
      </div>
    </body>
    </html>
  `;
}

export function downloadVersionHistoryHtml(options: ExportOptions): void {
  const html = generateVersionHistoryHtml(options);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `version-history-${options.questionId}-${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function openVersionHistoryPrintView(options: ExportOptions): void {
  const html = generateVersionHistoryHtml(options);
  const printWindow = window.open('', '_blank');
  
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  }
}
