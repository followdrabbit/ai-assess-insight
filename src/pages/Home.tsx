import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import {
  Shield,
  ClipboardCheck,
  BarChart3,
  FileText,
  Lock,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  PlayCircle,
  Sparkles,
  Home as HomeIcon,
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const breadcrumbItems = [
    { label: t('navigation.home'), icon: HomeIcon }
  ];

  const features = [
    {
      icon: ClipboardCheck,
      titleKey: 'home.featureAssessment',
      descKey: 'home.featureAssessmentDesc',
    },
    {
      icon: BarChart3,
      titleKey: 'home.featureDashboards',
      descKey: 'home.featureDashboardsDesc',
    },
    {
      icon: FileText,
      titleKey: 'home.featureReports',
      descKey: 'home.featureReportsDesc',
    },
    {
      icon: Lock,
      titleKey: 'home.featureSecure',
      descKey: 'home.featureSecureDesc',
    },
  ];

  const benefitKeys = [
    'home.benefit1',
    'home.benefit2',
    'home.benefit3',
    'home.benefit4',
    'home.benefit5',
  ];

  const steps = [
    {
      number: '1',
      titleKey: 'home.step1Title',
      descKey: 'home.step1Desc',
      actionKey: 'home.step1Action',
      route: '/assessment',
    },
    {
      number: '2',
      titleKey: 'home.step2Title',
      descKey: 'home.step2Desc',
    },
    {
      number: '3',
      titleKey: 'home.step3Title',
      descKey: 'home.step3Desc',
      highlight: true,
    },
    {
      number: '4',
      titleKey: 'home.step4Title',
      descKey: 'home.step4Desc',
      actionKey: 'home.step4Action',
      route: '/dashboard',
    },
  ];

  return (
    <div className="flex flex-col gap-8 sm:gap-12 py-4 sm:py-8">
      {/* Breadcrumb */}
      <PageBreadcrumb items={breadcrumbItems} className="mb-2" />

      {/* Hero Section */}
      <section className="text-center space-y-4 sm:space-y-6 py-6 sm:py-12 px-2">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium">
          <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          TrustLayer
        </div>
        
        <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground max-w-3xl mx-auto leading-tight">
          {t('home.heroTitle')}{' '}
          <span className="text-primary">{t('home.heroHighlight')}</span>
        </h1>
        
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('home.heroDescription')}
        </p>
        
        <div className="flex flex-col xs:flex-row gap-3 sm:gap-4 justify-center pt-2 sm:pt-4">
          <Button size="default" onClick={() => navigate('/assessment')} className="gap-2 w-full xs:w-auto">
            {t('home.startAssessment')}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="default" variant="outline" onClick={() => navigate('/dashboard')} className="w-full xs:w-auto">
            {t('home.viewDashboard')}
          </Button>
        </div>
      </section>

      {/* Quick Start Guide */}
      <section className="space-y-6 sm:space-y-8">
        <div className="text-center space-y-2 px-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs sm:text-sm font-medium mb-2">
            <PlayCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t('home.gettingStarted')}
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
            {t('home.howToUse')}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            {t('home.howToUseDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {steps.map((step) => (
            <Card 
              key={step.number} 
              className={`relative border-border ${step.highlight ? 'ring-2 ring-primary/50 bg-primary/5' : 'hover:border-primary/50'} transition-all`}
            >
              {step.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    <Sparkles className="h-3 w-3" />
                    {t('home.quickTip')}
                  </span>
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 font-bold text-lg ${step.highlight ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {step.number}
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base">{t(step.titleKey)}</CardTitle>
                    <CardDescription className="text-sm">
                      {t(step.descKey)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {step.actionKey && (
                <CardContent className="pt-0">
                  <Button 
                    variant={step.highlight ? 'default' : 'outline'} 
                    size="sm" 
                    className="w-full gap-2"
                    onClick={() => step.route && navigate(step.route)}
                  >
                    {t(step.actionKey)}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            💡 <strong>{t('home.tipLabel')}</strong> {t('home.tipText')}
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="space-y-6 sm:space-y-8">
        <div className="text-center space-y-2 px-2">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
            {t('home.mainFeatures')}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('home.mainFeaturesDesc')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {features.map((feature) => (
            <Card key={feature.titleKey} className="border-border hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2 sm:pb-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <feature.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <CardTitle className="text-sm sm:text-base">{t(feature.titleKey)}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs sm:text-sm">
                  {t(feature.descKey)}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-center py-6 sm:py-8">
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
            {t('home.whyUse')}
          </h2>
          <ul className="space-y-2 sm:space-y-3">
            {benefitKeys.map((key) => (
              <li key={key} className="flex items-start gap-2 sm:gap-3">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm sm:text-base text-muted-foreground">{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-2 sm:pb-4">
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-sm font-medium">{t('home.fullCoverage')}</span>
            </div>
            <CardTitle className="text-2xl sm:text-3xl">{t('home.domainsCount')}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t('home.domainsLabel')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 text-center">
              <div className="p-2 sm:p-3 rounded-lg bg-background/50">
                <div className="text-xl sm:text-2xl font-bold text-foreground">82</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">{t('home.questionsLabel')}</div>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-background/50">
                <div className="text-xl sm:text-2xl font-bold text-foreground">6+</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">{t('home.frameworksLabel')}</div>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t('home.basedOn')}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="text-center py-8 sm:py-12 px-4 sm:px-6 rounded-xl bg-muted/50 border border-border">
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2 sm:mb-3">
          {t('home.readyToStart')}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-lg mx-auto">
          {t('home.readyToStartDesc')}
        </p>
        <div className="flex flex-col xs:flex-row gap-3 sm:gap-4 justify-center">
          <Button size="default" onClick={() => navigate('/assessment')} className="gap-2 w-full xs:w-auto">
            {t('home.getStarted')}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="default" variant="outline" onClick={() => navigate('/assessment')} className="gap-2 w-full xs:w-auto">
            <Sparkles className="h-4 w-4" />
            {t('home.tryDemo')}
          </Button>
        </div>
      </section>
    </div>
  );
}
