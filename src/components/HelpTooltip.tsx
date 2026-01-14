import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function HelpTooltip({ title, children, className }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
        <span className="text-xs underline decoration-dotted cursor-help">{title}</span>
        <span className="text-xs">{isOpen ? '−' : '?'}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Pre-defined help content for common metrics
export function MaturityScoreHelp() {
  return (
    <HelpTooltip title="Como é calculado?">
      <div className="space-y-2">
        <p><strong>Score de Maturidade</strong> indica o nível de implementação dos controles de segurança de IA.</p>
        <p><strong>Fórmula:</strong> Score = Resposta × Fator de Evidência</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li><strong>Resposta:</strong> Sim = 100%, Parcial = 50%, Não = 0%</li>
          <li><strong>Evidência:</strong> Sim = 1.0×, Parcial = 0.9×, Não = 0.7×</li>
        </ul>
        <p className="mt-2"><strong>Níveis de Maturidade:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Nível 0 (0-24%):</strong> Inexistente - Sem práticas estabelecidas</li>
          <li><strong>Nível 1 (25-49%):</strong> Inicial - Práticas ad-hoc</li>
          <li><strong>Nível 2 (50-79%):</strong> Definido - Processos documentados</li>
          <li><strong>Nível 3 (80-100%):</strong> Gerenciado - Melhoria contínua</li>
        </ul>
      </div>
    </HelpTooltip>
  );
}

export function CoverageHelp() {
  return (
    <HelpTooltip title="O que significa?">
      <div className="space-y-2">
        <p><strong>Cobertura</strong> indica o percentual de perguntas respondidas.</p>
        <p><strong>Fórmula:</strong> Cobertura = Perguntas Respondidas ÷ Total de Perguntas Aplicáveis</p>
        <p className="mt-2 text-amber-600 dark:text-amber-400">
          <strong>Importante:</strong> Cobertura ≠ Maturidade. Alta cobertura com baixo score indica que você conhece seus gaps. Baixa cobertura significa que há áreas não avaliadas.
        </p>
      </div>
    </HelpTooltip>
  );
}

export function EvidenceReadinessHelp() {
  return (
    <HelpTooltip title="O que significa?">
      <div className="space-y-2">
        <p><strong>Prontidão de Evidências</strong> indica a disponibilidade de documentação comprobatória para os controles implementados.</p>
        <p><strong>Impacto:</strong> Controles sem evidência recebem penalidade de 10-30% no score efetivo.</p>
        <p className="mt-2">
          <strong>Para Auditorias:</strong> Prontidão de evidências é crítica para demonstrar conformidade. Controles implementados mas sem evidência podem não ser aceitos por auditores.
        </p>
      </div>
    </HelpTooltip>
  );
}

export function CriticalGapsHelp() {
  return (
    <HelpTooltip title="O que são?">
      <div className="space-y-2">
        <p><strong>Gaps Críticos</strong> são perguntas com score baixo ({"<"}50%) em subcategorias de criticidade Alta ou Crítica.</p>
        <p><strong>Prioridade:</strong> Estes gaps representam os maiores riscos e devem ser priorizados no roadmap de remediação.</p>
        <p className="mt-2">
          Gaps críticos não tratados podem resultar em:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Exposição a riscos de alto impacto</li>
          <li>Não conformidade regulatória</li>
          <li>Vulnerabilidades exploráveis</li>
        </ul>
      </div>
    </HelpTooltip>
  );
}

export function NistFunctionHelp() {
  return (
    <HelpTooltip title="Sobre NIST AI RMF">
      <div className="space-y-2">
        <p><strong>NIST AI Risk Management Framework</strong> organiza a gestão de riscos de IA em 4 funções:</p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li><strong>GOVERN:</strong> Cultura, políticas, papéis e accountability para IA responsável</li>
          <li><strong>MAP:</strong> Identificação e categorização de riscos no contexto de uso</li>
          <li><strong>MEASURE:</strong> Análise, avaliação e monitoramento de riscos identificados</li>
          <li><strong>MANAGE:</strong> Priorização, resposta e tratamento de riscos</li>
        </ul>
        <p className="mt-2 text-sm">
          Fonte: <a href="https://www.nist.gov/itl/ai-risk-management-framework" target="_blank" rel="noopener noreferrer" className="underline">NIST AI RMF</a>
        </p>
      </div>
    </HelpTooltip>
  );
}

// Role-based persona badges
export type PersonaType = 'executive' | 'grc' | 'specialist';

interface PersonaBadgeProps {
  persona: PersonaType;
  selected?: boolean;
  onClick?: () => void;
}

const personaConfig: Record<PersonaType, { label: string; description: string }> = {
  executive: {
    label: 'Executivo',
    description: 'CISO / Head de Segurança - Visão estratégica e priorização de riscos'
  },
  grc: {
    label: 'GRC',
    description: 'Security Manager - Cobertura, evidências e auditabilidade'
  },
  specialist: {
    label: 'Especialista',
    description: 'Arquiteto / Engenheiro - Detalhes técnicos e implementação'
  }
};

export function PersonaBadge({ persona, selected, onClick }: PersonaBadgeProps) {
  const config = personaConfig[persona];
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg border transition-all text-left",
        selected 
          ? "bg-primary text-primary-foreground border-primary" 
          : "bg-card hover:bg-muted border-border"
      )}
    >
      <div className="font-medium">{config.label}</div>
      <div className={cn("text-xs mt-0.5", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {config.description}
      </div>
    </button>
  );
}

export function PersonaSelector({ 
  value, 
  onChange 
}: { 
  value: PersonaType; 
  onChange: (persona: PersonaType) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(personaConfig) as PersonaType[]).map(persona => (
        <PersonaBadge
          key={persona}
          persona={persona}
          selected={value === persona}
          onClick={() => onChange(persona)}
        />
      ))}
    </div>
  );
}
