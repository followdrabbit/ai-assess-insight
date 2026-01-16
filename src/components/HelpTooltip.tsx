import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  
  return (
    <HelpTooltip title={t('help.howCalculated')} modalTitle={t('help.maturityScoreTitle')}>
      <div className="space-y-3">
        <p><strong>{t('help.maturityScoreTitle')}</strong> {t('help.maturityScoreDesc')}</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">{t('help.formula')}:</p>
          <p className="font-mono text-sm">{t('help.scoreFormula')}</p>
        </div>
        <div>
          <p className="font-medium mb-2">{t('help.responseValues')}:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>{t('help.responseYes')}:</strong> 100%</li>
            <li><strong>{t('help.responsePartial')}:</strong> 50%</li>
            <li><strong>{t('help.responseNo')}:</strong> 0%</li>
          </ul>
        </div>
        <div>
          <p className="font-medium mb-2">{t('help.evidenceMultiplier')}:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>{t('help.responseYes')}:</strong> 1.0× ({t('help.noPenalty')})</li>
            <li><strong>{t('help.responsePartial')}:</strong> 0.9× (−10%)</li>
            <li><strong>{t('help.responseNo')}:</strong> 0.7× (−30%)</li>
          </ul>
        </div>
        <div className="border-t pt-3">
          <p className="font-medium mb-2">{t('help.maturityLevels')}:</p>
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span>{t('help.level0')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              <span>{t('help.level1')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>{t('help.level2')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span>{t('help.level3')}</span>
            </div>
          </div>
        </div>
      </div>
    </HelpTooltip>
  );
}

export function CoverageHelp() {
  const { t } = useTranslation();
  
  return (
    <HelpTooltip title={t('help.whatMeans')} modalTitle={t('help.coverageTitle')}>
      <div className="space-y-3">
        <p><strong>{t('help.coverageTitle')}</strong> {t('help.coverageDesc')}</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">{t('help.formula')}:</p>
          <p className="font-mono text-sm">{t('help.coverageFormula')}</p>
        </div>
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">{t('help.important')}:</p>
          <p className="text-amber-700 dark:text-amber-300">
            {t('help.coverageNote')}
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

export function EvidenceReadinessHelp() {
  const { t } = useTranslation();
  
  return (
    <HelpTooltip title={t('help.whatMeans')} modalTitle={t('help.evidenceTitle')}>
      <div className="space-y-3">
        <p><strong>{t('help.evidenceTitle')}</strong> {t('help.evidenceDesc')}</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">{t('help.scoreImpact')}</p>
          <p>{t('help.evidenceImpact')}</p>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">{t('help.forAudits')}:</p>
          <p className="text-blue-700 dark:text-blue-300">
            {t('help.evidenceAudit')}
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

// Domain-aware Critical Gaps help
interface DomainCriticalGapsHelpProps {
  securityDomainId?: string;
}

export function DomainCriticalGapsHelp({ securityDomainId = 'AI_SECURITY' }: DomainCriticalGapsHelpProps) {
  const { t } = useTranslation();
  
  const getTitleKey = () => {
    switch (securityDomainId) {
      case 'CLOUD_SECURITY': return 'help.criticalGapsCloud';
      case 'DEVSECOPS': return 'help.criticalGapsDevSecOps';
      default: return 'help.criticalGapsAI';
    }
  };
  
  const getDescKey = () => {
    switch (securityDomainId) {
      case 'CLOUD_SECURITY': return 'help.criticalGapsDescCloud';
      case 'DEVSECOPS': return 'help.criticalGapsDescDevsecops';
      default: return 'help.criticalGapsDescAI';
    }
  };
  
  const getRisks = () => {
    switch (securityDomainId) {
      case 'CLOUD_SECURITY':
        return ['help.riskCloud1', 'help.riskCloud2', 'help.riskCloud3', 'help.riskCloud4'];
      case 'DEVSECOPS':
        return ['help.riskDevsecops1', 'help.riskDevsecops2', 'help.riskDevsecops3', 'help.riskDevsecops4'];
      default:
        return ['help.riskAI1', 'help.riskAI2', 'help.riskAI3', 'help.riskAI4'];
    }
  };
  
  return (
    <HelpTooltip title={t('help.whatAre')} modalTitle={t(getTitleKey())}>
      <div className="space-y-3">
        <p><strong>{t(getTitleKey())}:</strong> {t(getDescKey())}</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">{t('help.prioritizationMethodology')}:</p>
          <p className="text-sm">{t('help.gapsOrderedBy')}</p>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="font-medium text-red-700 dark:text-red-400 mb-2">{t('help.specificRisks')}:</p>
          <ul className="list-disc list-inside space-y-1 text-red-700 dark:text-red-300 text-sm">
            {getRisks().map((riskKey) => (
              <li key={riskKey}>{t(riskKey)}</li>
            ))}
          </ul>
        </div>
      </div>
    </HelpTooltip>
  );
}

// Legacy export for backward compatibility
export function CriticalGapsHelp() {
  return <DomainCriticalGapsHelp securityDomainId="AI_SECURITY" />;
}

// Domain-aware Strategic Roadmap help
interface DomainRoadmapHelpProps {
  securityDomainId?: string;
}

export function DomainRoadmapHelp({ securityDomainId = 'AI_SECURITY' }: DomainRoadmapHelpProps) {
  const { t } = useTranslation();
  
  const getTitleKey = () => {
    switch (securityDomainId) {
      case 'CLOUD_SECURITY': return 'help.roadmapCloud';
      case 'DEVSECOPS': return 'help.roadmapDevSecOps';
      default: return 'help.roadmapAI';
    }
  };
  
  const getCriteriaKeys = () => {
    switch (securityDomainId) {
      case 'CLOUD_SECURITY':
        return [
          { period: 'help.days0to30', criteria: 'help.roadmapCriteriaCloud0to30' },
          { period: 'help.days30to60', criteria: 'help.roadmapCriteriaCloud30to60' },
          { period: 'help.days60to90', criteria: 'help.roadmapCriteriaCloud60to90' },
        ];
      case 'DEVSECOPS':
        return [
          { period: 'help.days0to30', criteria: 'help.roadmapCriteriaDevsecops0to30' },
          { period: 'help.days30to60', criteria: 'help.roadmapCriteriaDevsecops30to60' },
          { period: 'help.days60to90', criteria: 'help.roadmapCriteriaDevsecops60to90' },
        ];
      default:
        return [
          { period: 'help.days0to30', criteria: 'help.roadmapCriteriaAI0to30' },
          { period: 'help.days30to60', criteria: 'help.roadmapCriteriaAI30to60' },
          { period: 'help.days60to90', criteria: 'help.roadmapCriteriaAI60to90' },
        ];
    }
  };
  
  return (
    <HelpTooltip title={t('help.howToPrioritize')} modalTitle={t(getTitleKey())}>
      <div className="space-y-3">
        <p><strong>{t(getTitleKey())}:</strong> {t('help.roadmapDesc')}</p>
        <div className="space-y-2">
          {getCriteriaKeys().map((p) => (
            <div key={p.period} className="p-3 bg-muted rounded-lg">
              <p className="font-medium text-primary mb-1">{t(p.period)}</p>
              <p className="text-sm">{t(p.criteria)}</p>
            </div>
          ))}
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">{t('help.tip')}:</p>
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            {t('help.roadmapTip')}
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

// Domain-aware framework help
interface DomainFunctionHelpProps {
  securityDomainId?: string;
}

export function DomainFunctionHelp({ securityDomainId = 'AI_SECURITY' }: DomainFunctionHelpProps) {
  const { t } = useTranslation();
  
  const getConfig = () => {
    switch (securityDomainId) {
      case 'CLOUD_SECURITY':
        return {
          titleKey: 'help.aboutCsa',
          modalTitleKey: 'help.csaCCMTitle',
          frameworkDescKey: 'help.csaCCMDesc',
          functions: [
            { name: 'help.govern', label: 'help.governLabel', desc: 'help.governDescCloud' },
            { name: 'help.manage', label: 'help.manageLabel', desc: 'help.manageDescCloud' },
            { name: 'help.measure', label: 'help.measureLabel', desc: 'help.measureDescCloud' },
            { name: 'help.map', label: 'help.mapLabel', desc: 'help.mapDescCloud' },
          ],
          sourceUrl: 'https://cloudsecurityalliance.org/research/cloud-controls-matrix',
          sourceName: 'CSA CCM',
        };
      case 'DEVSECOPS':
        return {
          titleKey: 'help.aboutSsdf',
          modalTitleKey: 'help.nistSSDFTitle',
          frameworkDescKey: 'help.nistSSDFDesc',
          functions: [
            { name: 'help.govern', label: 'help.governLabel', desc: 'help.governDescDevsecops' },
            { name: 'help.map', label: 'help.mapLabel', desc: 'help.mapDescDevsecops' },
            { name: 'help.measure', label: 'help.measureLabel', desc: 'help.measureDescDevsecops' },
            { name: 'help.manage', label: 'help.manageLabel', desc: 'help.manageDescDevsecops' },
          ],
          sourceUrl: 'https://csrc.nist.gov/Projects/ssdf',
          sourceName: 'NIST SSDF',
        };
      default:
        return {
          titleKey: 'help.aboutNist',
          modalTitleKey: 'help.nistAIRMFTitle',
          frameworkDescKey: 'help.nistAIRMFDesc',
          functions: [
            { name: 'help.govern', label: 'help.governLabel', desc: 'help.governDescAI' },
            { name: 'help.map', label: 'help.mapLabel', desc: 'help.mapDescAI' },
            { name: 'help.measure', label: 'help.measureLabel', desc: 'help.measureDescAI' },
            { name: 'help.manage', label: 'help.manageLabel', desc: 'help.manageDescAI' },
          ],
          sourceUrl: 'https://www.nist.gov/itl/ai-risk-management-framework',
          sourceName: 'NIST AI RMF',
        };
    }
  };
  
  const config = getConfig();
  
  return (
    <HelpTooltip title={t(config.titleKey)} modalTitle={t(config.modalTitleKey)}>
      <div className="space-y-3">
        <p><strong>{t(config.modalTitleKey)}</strong> {t(config.frameworkDescKey)}</p>
        <div className="space-y-3">
          {config.functions.map((func) => (
            <div key={func.name} className="p-3 bg-muted rounded-lg">
              <p className="font-medium text-primary mb-1">{t(func.name)} ({t(func.label)})</p>
              <p>{t(func.desc)}</p>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t">
          <p className="text-sm">
            {t('help.source')}: <a href={config.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">{config.sourceName}</a>
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

// Legacy export for backward compatibility - now defaults to AI_SECURITY
export function NistFunctionHelp() {
  return <DomainFunctionHelp securityDomainId="AI_SECURITY" />;
}

export function FrameworkCategoryHelp() {
  const { t } = useTranslation();
  
  return (
    <HelpTooltip title={t('help.whatAre')} modalTitle={t('help.frameworkCategoriesTitle')}>
      <div className="space-y-3">
        <p><strong>{t('help.frameworkCategoriesTitle')}</strong> {t('help.frameworkCategoriesDesc')}</p>
        <div className="space-y-2">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">🏛️ {t('help.coreFrameworks')}</p>
            <p className="text-sm">{t('help.coreFrameworksDesc')}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">⭐ {t('help.highValue')}</p>
            <p className="text-sm">{t('help.highValueDesc')}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">🔧 {t('help.technicalFocus')}</p>
            <p className="text-sm">{t('help.technicalFocusDesc')}</p>
          </div>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">{t('help.tip')}:</p>
          <p className="text-blue-700 dark:text-blue-300">
            {t('help.frameworkBadgeTip')}
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

export function CriticalityLevelsHelp() {
  const { t } = useTranslation();
  
  return (
    <HelpTooltip title={t('help.criticalityLevels')} modalTitle={t('help.criticalityTitle')}>
      <div className="space-y-3">
        <p><strong>{t('help.criticalityTitle')}</strong> {t('help.criticalityDesc')}</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2 rounded bg-red-50 dark:bg-red-950/30">
            <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <div>
              <span className="font-medium">{t('help.criticalLevel')}:</span>
              <span className="text-sm ml-1">{t('help.criticalLevelDesc')}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-orange-50 dark:bg-orange-950/30">
            <span className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0" />
            <div>
              <span className="font-medium">{t('help.highLevel')}:</span>
              <span className="text-sm ml-1">{t('help.highLevelDesc')}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-blue-50 dark:bg-blue-950/30">
            <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
            <div>
              <span className="font-medium">{t('help.mediumLevel')}:</span>
              <span className="text-sm ml-1">{t('help.mediumLevelDesc')}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-gray-50 dark:bg-gray-950/30">
            <span className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />
            <div>
              <span className="font-medium">{t('help.lowLevel')}:</span>
              <span className="text-sm ml-1">{t('help.lowLevelDesc')}</span>
            </div>
          </div>
        </div>
      </div>
    </HelpTooltip>
  );
}

export function HeatmapHelp() {
  const { t } = useTranslation();
  
  return (
    <HelpTooltip title={t('help.howToRead')} modalTitle={t('help.heatmapTitle')}>
      <div className="space-y-3">
        <p><strong>{t('help.heatmapTitle')}</strong> {t('help.heatmapDesc')}</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-2">{t('help.colorInterpretation')}:</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-4 rounded bg-red-500" />
              <span className="text-sm">{t('help.controlNonExistent')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-4 rounded bg-orange-500" />
              <span className="text-sm">{t('help.controlInitial')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-4 rounded bg-yellow-500" />
              <span className="text-sm">{t('help.controlDefined')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-4 rounded bg-green-500" />
              <span className="text-sm">{t('help.controlManaged')}</span>
            </div>
          </div>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">{t('help.tip')}:</p>
          <p className="text-blue-700 dark:text-blue-300">
            {t('help.heatmapTip')}
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

export function OwnershipHelp() {
  const { t } = useTranslation();
  
  return (
    <HelpTooltip title={t('help.whatMeans')} modalTitle={t('help.ownershipTitle')}>
      <div className="space-y-3">
        <p><strong>{t('help.ownershipTitle')}</strong> {t('help.ownershipDesc')}</p>
        <div className="space-y-2">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">🔐 {t('help.ownerSecurity')}</p>
            <p className="text-sm">{t('help.ownerSecurityDesc')}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">💻 {t('help.ownerDevelopment')}</p>
            <p className="text-sm">{t('help.ownerDevelopmentDesc')}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">📊 {t('help.ownerDataScience')}</p>
            <p className="text-sm">{t('help.ownerDataScienceDesc')}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">⚖️ {t('help.ownerLegal')}</p>
            <p className="text-sm">{t('help.ownerLegalDesc')}</p>
          </div>
        </div>
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">{t('help.important')}:</p>
          <p className="text-amber-700 dark:text-amber-300">
            {t('help.ownershipTip')}
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

// Domain-aware Response Distribution help
interface DomainResponseDistributionHelpProps {
  securityDomainId?: string;
}

export function DomainResponseDistributionHelp({ securityDomainId = 'AI_SECURITY' }: DomainResponseDistributionHelpProps) {
  const { t } = useTranslation();
  
  const getContextKey = () => {
    switch (securityDomainId) {
      case 'CLOUD_SECURITY': return 'help.responseDistContextCloud';
      case 'DEVSECOPS': return 'help.responseDistContextDevsecops';
      default: return 'help.responseDistContextAI';
    }
  };
  
  return (
    <HelpTooltip title={t('help.whatMeans')} modalTitle={t('help.responseDistributionTitle')}>
      <div className="space-y-3">
        <p><strong>{t('help.responseDistributionTitle')}</strong> {t('help.responseDistributionDesc')}</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2 rounded bg-green-50 dark:bg-green-950/30">
            <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
            <div>
              <span className="font-medium">{t('help.responseYes')}:</span>
              <span className="text-sm ml-1">{t('help.responseYesDesc')}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-yellow-50 dark:bg-yellow-950/30">
            <span className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
            <div>
              <span className="font-medium">{t('help.responsePartial')}:</span>
              <span className="text-sm ml-1">{t('help.responsePartialDesc')}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-red-50 dark:bg-red-950/30">
            <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <div>
              <span className="font-medium">{t('help.responseNo')}:</span>
              <span className="text-sm ml-1">{t('help.responseNoDesc')}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-gray-50 dark:bg-gray-950/30">
            <span className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />
            <div>
              <span className="font-medium">{t('help.responseNA')}:</span>
              <span className="text-sm ml-1">{t('help.responseNADesc')}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-gray-50 dark:bg-gray-950/30">
            <span className="w-3 h-3 rounded-full bg-gray-300 flex-shrink-0" />
            <div>
              <span className="font-medium">{t('help.responsePending')}:</span>
              <span className="text-sm ml-1">{t('help.responsePendingDesc')}</span>
            </div>
          </div>
        </div>
        <div className="pt-2 border-t text-xs text-muted-foreground">
          {t(getContextKey())}
        </div>
      </div>
    </HelpTooltip>
  );
}

// Legacy export for backward compatibility
export function ResponseDistributionHelp() {
  return <DomainResponseDistributionHelp securityDomainId="AI_SECURITY" />;
}

// Domain-aware Risk Distribution / Criticality help
interface DomainRiskDistributionHelpProps {
  securityDomainId?: string;
}

export function DomainRiskDistributionHelp({ securityDomainId = 'AI_SECURITY' }: DomainRiskDistributionHelpProps) {
  const { t } = useTranslation();
  
  const getTitleKey = () => {
    switch (securityDomainId) {
      case 'CLOUD_SECURITY': return 'help.criticalGapsCloud';
      case 'DEVSECOPS': return 'help.criticalGapsDevSecOps';
      default: return 'help.criticalGapsAI';
    }
  };
  
  const getDescKey = () => {
    switch (securityDomainId) {
      case 'CLOUD_SECURITY': return 'help.riskDistDescCloud';
      case 'DEVSECOPS': return 'help.riskDistDescDevsecops';
      default: return 'help.riskDistDescAI';
    }
  };
  
  const getRefKey = () => {
    switch (securityDomainId) {
      case 'CLOUD_SECURITY': return 'help.riskDistRefCloud';
      case 'DEVSECOPS': return 'help.riskDistRefDevsecops';
      default: return 'help.riskDistRefAI';
    }
  };
  
  return (
    <HelpTooltip title={t('help.riskLevels')} modalTitle={t(getTitleKey())}>
      <div className="space-y-3">
        <p><strong>{t(getTitleKey())}:</strong> {t(getDescKey())}</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2 rounded bg-red-50 dark:bg-red-950/30">
            <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <div>
              <span className="font-medium">{t('help.criticalLevel')}:</span>
              <span className="text-sm ml-1">{t('help.severeImpact')}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-orange-50 dark:bg-orange-950/30">
            <span className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0" />
            <div>
              <span className="font-medium">{t('help.highLevel')}:</span>
              <span className="text-sm ml-1">{t('help.significantRisk')}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-blue-50 dark:bg-blue-950/30">
            <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
            <div>
              <span className="font-medium">{t('help.mediumLevel')}:</span>
              <span className="text-sm ml-1">{t('help.moderateImpact')}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-gray-50 dark:bg-gray-950/30">
            <span className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />
            <div>
              <span className="font-medium">{t('help.lowLevel')}:</span>
              <span className="text-sm ml-1">{t('help.limitedImpact')}</span>
            </div>
          </div>
        </div>
        <div className="pt-2 border-t text-xs text-muted-foreground">
          {t(getRefKey())}
        </div>
      </div>
    </HelpTooltip>
  );
}

// Domain-aware Framework Coverage help
interface DomainFrameworkCoverageHelpProps {
  securityDomainId?: string;
}

export function DomainFrameworkCoverageHelp({ securityDomainId = 'AI_SECURITY' }: DomainFrameworkCoverageHelpProps) {
  const { t } = useTranslation();
  
  const getTitleKey = () => {
    switch (securityDomainId) {
      case 'CLOUD_SECURITY': return 'help.frameworkCoverageDescCloud';
      case 'DEVSECOPS': return 'help.frameworkCoverageDescDevsecops';
      default: return 'help.frameworkCoverageDescAI';
    }
  };
  
  const getFrameworks = () => {
    switch (securityDomainId) {
      case 'CLOUD_SECURITY':
        return ['CSA CCM', 'CIS Benchmarks', 'SOC 2', 'ISO 27017'];
      case 'DEVSECOPS':
        return ['NIST SSDF', 'OWASP SAMM', 'SLSA', 'BSIMM'];
      default:
        return ['NIST AI RMF', 'ISO 42001', 'EU AI Act', 'OWASP ML Top 10'];
    }
  };
  
  return (
    <HelpTooltip title={t('help.aboutFrameworks')} modalTitle={t('help.frameworkCoverageTitle')}>
      <div className="space-y-3">
        <p><strong>{t('help.frameworkCoverageTitle')}:</strong> {t(getTitleKey())}</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-2">{t('help.referenceFrameworks')}:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {getFrameworks().map((fw) => (
              <li key={fw}>{fw}</li>
            ))}
          </ul>
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">{t('help.metricsDisplayed')}:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>{t('help.scoreMetric')}:</strong> {t('help.scoreMetricDesc')}</li>
            <li><strong>{t('help.coverageMetric')}:</strong> {t('help.coverageMetricDesc')}</li>
          </ul>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">{t('help.tip')}:</p>
          <p className="text-blue-700 dark:text-blue-300">
            {t('help.frameworkBadgeHeaderTip')}
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

// Domain-aware Domain Metrics help
interface DomainMetricsHelpProps {
  securityDomainId?: string;
}

export function DomainMetricsHelpAware({ securityDomainId = 'AI_SECURITY' }: DomainMetricsHelpProps) {
  const { t } = useTranslation();
  
  const getTitleKey = () => {
    switch (securityDomainId) {
      case 'CLOUD_SECURITY': return 'help.domainMetricsDescCloud';
      case 'DEVSECOPS': return 'help.domainMetricsDescDevsecops';
      default: return 'help.domainMetricsDescAI';
    }
  };
  
  const getExamplesKey = () => {
    switch (securityDomainId) {
      case 'CLOUD_SECURITY': return 'help.domainExamplesCloud';
      case 'DEVSECOPS': return 'help.domainExamplesDevsecops';
      default: return 'help.domainExamplesAI';
    }
  };
  
  return (
    <HelpTooltip title={t('help.whatAre')} modalTitle={t('help.domainMetricsTitle')}>
      <div className="space-y-3">
        <p><strong>{t('help.domainMetricsTitle')}:</strong> {t(getTitleKey())}</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-2">{t('help.exampleDomains')}:</p>
          <p className="text-sm">{t(getExamplesKey())}</p>
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-2">{t('help.metricsDisplayed')}:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>{t('help.coverageMetric')}:</strong> {t('help.coverageMetricDesc')}</li>
            <li><strong>{t('help.maturityMetric')}:</strong> {t('help.maturityMetricDesc')}</li>
            <li><strong>{t('help.domainGaps')}:</strong> {t('help.gapsWithLowScore')}</li>
          </ul>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">{t('help.tip')}:</p>
          <p className="text-blue-700 dark:text-blue-300">
            {t('help.domainClickTip')}
          </p>
        </div>
      </div>
    </HelpTooltip>
  );
}

export function DomainMetricsHelp() {
  const { t } = useTranslation();
  
  return (
    <HelpTooltip title={t('help.whatAre')} modalTitle={t('help.domainMetricsTitle')}>
      <div className="space-y-3">
        <p><strong>{t('help.domainMetricsTitle')}</strong> {t('help.domainMetricsGeneralDesc')}</p>
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium mb-2">{t('help.metricsDisplayed')}:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>{t('help.coverageMetric')}:</strong> {t('help.coverageMetricDesc')}</li>
            <li><strong>{t('help.maturityMetric')}:</strong> {t('help.maturityMetricDesc')}</li>
            <li><strong>{t('help.domainGaps')}:</strong> {t('help.gapsWithLowScore')}</li>
          </ul>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">{t('help.tip')}:</p>
          <p className="text-blue-700 dark:text-blue-300">
            {t('help.domainClickTip')}
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

export function PersonaBadge({ persona, selected, onClick }: PersonaBadgeProps) {
  const { t } = useTranslation();
  
  const getConfig = (p: PersonaType) => {
    switch (p) {
      case 'executive':
        return { label: t('help.personaExecutive'), description: t('help.personaExecutiveDesc') };
      case 'grc':
        return { label: t('help.personaGRC'), description: t('help.personaGRCDesc') };
      case 'specialist':
        return { label: t('help.personaSpecialist'), description: t('help.personaSpecialistDesc') };
    }
  };
  
  const config = getConfig(persona);
  
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
  const personas: PersonaType[] = ['executive', 'grc', 'specialist'];
  
  return (
    <div className="flex flex-wrap gap-2">
      {personas.map(persona => (
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
