import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
  title: string;
  modalTitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function HelpTooltip({ title, modalTitle, children, className }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors",
            className
          )}
        >
          <span className="text-xs underline decoration-dotted cursor-help">{title}</span>
          <span className="text-xs">?</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modalTitle || title}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground space-y-2 pt-2">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Pre-defined help content for common metrics
export function MaturityScoreHelp() {
  return (
    <HelpTooltip title="Como é calculado?" modalTitle="Score de Maturidade">
      <div className="space-y-3">
        <p><strong>Score de Maturidade</strong> indica o nível de implementação dos controles de segurança de IA.</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">Fórmula:</p>
          <p className="font-mono text-sm">Score = Resposta × Fator de Evidência</p>
        </div>
        <div>
          <p className="font-medium mb-2">Valores de Resposta:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Sim:</strong> 100%</li>
            <li><strong>Parcial:</strong> 50%</li>
            <li><strong>Não:</strong> 0%</li>
          </ul>
        </div>
        <div>
          <p className="font-medium mb-2">Multiplicador de Evidência:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Sim:</strong> 1.0× (sem penalidade)</li>
            <li><strong>Parcial:</strong> 0.9× (−10%)</li>
            <li><strong>Não:</strong> 0.7× (−30%)</li>
          </ul>
        </div>
        <div className="border-t pt-3">
          <p className="font-medium mb-2">Níveis de Maturidade:</p>
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span><strong>Nível 0 (0-24%):</strong> Inexistente - Sem práticas estabelecidas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              <span><strong>Nível 1 (25-49%):</strong> Inicial - Práticas ad-hoc</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span><strong>Nível 2 (50-79%):</strong> Definido - Processos documentados</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span><strong>Nível 3 (80-100%):</strong> Gerenciado - Melhoria contínua</span>
            </div>
          </div>
        </div>
      </div>
    </HelpTooltip>
  );
}

export function CoverageHelp() {
  return (
    <HelpTooltip title="O que significa?" modalTitle="Cobertura da Avaliação">
      <div className="space-y-3">
        <p><strong>Cobertura</strong> indica o percentual de perguntas respondidas em relação ao total de perguntas aplicáveis.</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">Fórmula:</p>
          <p className="font-mono text-sm">Cobertura = Perguntas Respondidas ÷ Total Aplicáveis</p>
        </div>
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">Importante:</p>
          <p className="text-amber-700 dark:text-amber-300">
            Cobertura ≠ Maturidade. Alta cobertura com baixo score indica que você conhece seus gaps. 
            Baixa cobertura significa que há áreas não avaliadas que podem esconder riscos.
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

export function EvidenceReadinessHelp() {
  return (
    <HelpTooltip title="O que significa?" modalTitle="Prontidão de Evidências">
      <div className="space-y-3">
        <p><strong>Prontidão de Evidências</strong> indica a disponibilidade de documentação comprobatória para os controles implementados.</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">Impacto no Score:</p>
          <p>Controles sem evidência recebem penalidade de <strong>10% a 30%</strong> no score efetivo.</p>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Para Auditorias:</p>
          <p className="text-blue-700 dark:text-blue-300">
            Prontidão de evidências é crítica para demonstrar conformidade. 
            Controles implementados mas sem evidência documental podem não ser aceitos por auditores externos.
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

export function CriticalGapsHelp() {
  return (
    <HelpTooltip title="O que são?" modalTitle="Gaps Críticos">
      <div className="space-y-3">
        <p><strong>Gaps Críticos</strong> são perguntas com score baixo ({"<"}50%) em subcategorias de criticidade Alta ou Crítica.</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">Prioridade:</p>
          <p>Estes gaps representam os maiores riscos e devem ser priorizados no roadmap de remediação.</p>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="font-medium text-red-700 dark:text-red-400 mb-2">Riscos de gaps não tratados:</p>
          <ul className="list-disc list-inside space-y-1 text-red-700 dark:text-red-300">
            <li>Exposição a riscos de alto impacto</li>
            <li>Não conformidade regulatória</li>
            <li>Vulnerabilidades exploráveis</li>
          </ul>
        </div>
      </div>
    </HelpTooltip>
  );
}

export function NistFunctionHelp() {
  return (
    <HelpTooltip title="Sobre NIST AI RMF" modalTitle="NIST AI Risk Management Framework">
      <div className="space-y-3">
        <p><strong>NIST AI Risk Management Framework</strong> organiza a gestão de riscos de IA em 4 funções principais:</p>
        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium text-primary mb-1">GOVERN (Governar)</p>
            <p>Cultura, políticas, papéis e accountability para IA responsável. Define a estrutura organizacional e as responsabilidades.</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium text-primary mb-1">MAP (Mapear)</p>
            <p>Identificação e categorização de riscos no contexto de uso. Entende onde e como a IA é utilizada.</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium text-primary mb-1">MEASURE (Medir)</p>
            <p>Análise, avaliação e monitoramento de riscos identificados. Quantifica e acompanha os riscos ao longo do tempo.</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium text-primary mb-1">MANAGE (Gerenciar)</p>
            <p>Priorização, resposta e tratamento de riscos. Implementa controles e mitiga as vulnerabilidades.</p>
          </div>
        </div>
        <div className="pt-2 border-t">
          <p className="text-sm">
            Fonte: <a href="https://www.nist.gov/itl/ai-risk-management-framework" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">NIST AI RMF</a>
          </p>
        </div>
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
