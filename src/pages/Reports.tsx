import { useMemo, useState, useEffect } from 'react';
import { useAnswersStore } from '@/lib/stores';
import { fetchDomains, Domain } from '@/lib/datasetData';
import { calculateOverallMetrics, getCriticalGaps, getFrameworkCoverage } from '@/lib/scoring';
import { exportAnswersToXLSX, downloadXLSX, generateExportFilename } from '@/lib/xlsxExport';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Reports() {
  const { answers, isLoading } = useAnswersStore();
  const [domains, setDomains] = useState<Domain[]>([]);

  useEffect(() => {
    fetchDomains().then(setDomains).catch(console.error);
  }, []);

  const metrics = useMemo(() => calculateOverallMetrics(answers), [answers]);
  const criticalGaps = useMemo(() => getCriticalGaps(answers, 0.5), [answers]);
  const frameworkCoverage = useMemo(() => getFrameworkCoverage(answers), [answers]);

  const handleExportXLSX = () => {
    const blob = exportAnswersToXLSX(answers);
    downloadXLSX(blob, generateExportFilename());
    toast.success('Relatório exportado com sucesso');
  };

  const handleExportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      summary: {
        overallScore: metrics.overallScore,
        maturityLevel: metrics.maturityLevel,
        coverage: metrics.coverage,
        criticalGaps: metrics.criticalGaps,
      },
      domainMetrics: metrics.domainMetrics,
      answers: Array.from(answers.values()),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-security-assessment-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON exportado');
  };

  const generateMarkdownReport = () => {
    let md = `# Relatório de Avaliação de Segurança de IA\n\n`;
    md += `**Data:** ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    md += `## Resumo Executivo\n\n`;
    md += `- **Score Geral:** ${Math.round(metrics.overallScore * 100)}%\n`;
    md += `- **Nível de Maturidade:** ${metrics.maturityLevel.level} - ${metrics.maturityLevel.name}\n`;
    md += `- **Cobertura:** ${Math.round(metrics.coverage * 100)}%\n`;
    md += `- **Gaps Críticos:** ${metrics.criticalGaps}\n\n`;
    
    md += `## Resultados por Domínio\n\n`;
    metrics.domainMetrics.forEach(dm => {
      md += `### ${dm.domainName}\n`;
      md += `- Score: ${Math.round(dm.score * 100)}% (Nível ${dm.maturityLevel.level})\n`;
      md += `- Cobertura: ${dm.answeredQuestions}/${dm.totalQuestions} perguntas\n\n`;
    });

    if (criticalGaps.length > 0) {
      md += `## Top Gaps Críticos\n\n`;
      criticalGaps.slice(0, 10).forEach((gap, i) => {
        md += `${i + 1}. **${gap.subcatName}** (${gap.criticality}): ${gap.questionText}\n`;
      });
    }

    return md;
  };

  const handleExportMarkdown = () => {
    const md = generateMarkdownReport();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-security-assessment-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Markdown exportado');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      {/* Export Options */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold mb-4">Exportar Relatório</h3>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleExportXLSX}>Exportar XLSX</Button>
          <Button onClick={handleExportJSON} variant="outline">Exportar JSON</Button>
          <Button onClick={handleExportMarkdown} variant="outline">Exportar Markdown</Button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold mb-4">Resumo Executivo</h3>
        <div className="prose prose-sm max-w-none">
          <p>
            A avaliação de maturidade em segurança de IA apresenta um score geral de{' '}
            <strong>{Math.round(metrics.overallScore * 100)}%</strong>, correspondendo ao{' '}
            <strong>Nível {metrics.maturityLevel.level} - {metrics.maturityLevel.name}</strong>.
          </p>
          <p>
            Foram respondidas {metrics.answeredQuestions} de {metrics.totalQuestions} perguntas 
            ({Math.round(metrics.coverage * 100)}% de cobertura), identificando {metrics.criticalGaps} gaps críticos
            em subcategorias de alta e crítica criticidade.
          </p>
        </div>
      </div>

      {/* Domain Summary Table */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold mb-4">Resultados por Domínio</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Domínio</th>
              <th>Score</th>
              <th>Maturidade</th>
              <th>Cobertura</th>
              <th>Gaps</th>
            </tr>
          </thead>
          <tbody>
            {metrics.domainMetrics.map(dm => (
              <tr key={dm.domainId}>
                <td className="font-medium">{dm.domainName}</td>
                <td className="font-mono">{Math.round(dm.score * 100)}%</td>
                <td>
                  <span className={cn("maturity-badge", `maturity-${dm.maturityLevel.level}`)}>
                    {dm.maturityLevel.name}
                  </span>
                </td>
                <td>{dm.answeredQuestions}/{dm.totalQuestions}</td>
                <td className="font-mono">{dm.criticalGaps}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Framework Coverage */}
      {frameworkCoverage.length > 0 && (
        <div className="card-elevated p-6">
          <h3 className="font-semibold mb-4">Cobertura por Framework</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Framework</th>
                <th>Perguntas</th>
                <th>Respondidas</th>
                <th>Score Médio</th>
              </tr>
            </thead>
            <tbody>
              {frameworkCoverage.map(fw => (
                <tr key={fw.framework}>
                  <td className="font-medium">{fw.framework}</td>
                  <td>{fw.totalQuestions}</td>
                  <td>{fw.answeredQuestions}</td>
                  <td className="font-mono">{Math.round(fw.averageScore * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
