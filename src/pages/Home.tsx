import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';

const features = [
  {
    icon: ClipboardCheck,
    title: 'Avaliação Completa',
    description: 'Framework estruturado com 82 questões baseadas no NIST AI RMF, ISO/IEC 42001 e regulamentações BACEN.',
  },
  {
    icon: BarChart3,
    title: 'Dashboards Executivos',
    description: 'Visualizações para diferentes perfis: CISO, GRC e especialistas técnicos.',
  },
  {
    icon: FileText,
    title: 'Relatórios Detalhados',
    description: 'Exportação para Excel com gaps, roadmap e recomendações priorizadas.',
  },
  {
    icon: Lock,
    title: 'Dados Seguros',
    description: 'Seus dados são armazenados de forma segura na nuvem com acesso exclusivo à sua organização.',
  },
];

const benefits = [
  'Alinhamento com NIST AI RMF, ISO 42001, LGPD e regulamentações BACEN',
  'Identificação de gaps críticos de segurança em IA',
  'Roadmap priorizado 30/60/90 dias',
  'Métricas de maturidade por domínio e framework',
  'Suporte a múltiplos perfis de stakeholders',
];

const steps = [
  {
    number: '1',
    title: 'Acesse a Avaliação',
    description: 'Clique em "Iniciar Avaliação" para acessar o questionário completo.',
    action: 'Ir para Avaliação',
    route: '/assessment',
  },
  {
    number: '2',
    title: 'Gere Dados de Demonstração',
    description: 'Na tela de avaliação, clique no botão "Gerar Demo" para preencher automaticamente respostas de exemplo e visualizar a ferramenta em ação.',
    highlight: true,
  },
  {
    number: '3',
    title: 'Explore os Dashboards',
    description: 'Consulte os dashboards Executivo, GRC e Especialista para ver métricas, gaps críticos e roadmap de melhorias.',
    action: 'Ver Dashboards',
    route: '/dashboard',
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-12 py-8">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Shield className="h-4 w-4" />
          Framework de Avaliação de Segurança em IA
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground max-w-3xl mx-auto">
          Avalie a Maturidade de Segurança em{' '}
          <span className="text-primary">Inteligência Artificial</span>
        </h1>
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Ferramenta completa para avaliar, medir e melhorar a postura de segurança 
          das iniciativas de IA da sua organização, alinhada com os principais 
          frameworks e regulamentações do mercado.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button size="lg" onClick={() => navigate('/assessment')} className="gap-2">
            Iniciar Avaliação
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/dashboard')}>
            Ver Dashboard
          </Button>
        </div>
      </section>

      {/* Quick Start Guide */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-2">
            <PlayCircle className="h-4 w-4" />
            Começando Agora
          </div>
          <h2 className="text-2xl font-semibold text-foreground">
            Como Usar a Ferramenta
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Siga estes 3 passos simples para explorar todas as funcionalidades
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <Card 
              key={step.number} 
              className={`relative border-border ${step.highlight ? 'ring-2 ring-primary/50 bg-primary/5' : 'hover:border-primary/50'} transition-all`}
            >
              {step.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    <Sparkles className="h-3 w-3" />
                    Dica Rápida
                  </span>
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 font-bold text-lg ${step.highlight ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {step.number}
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base">{step.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {step.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {step.action && (
                <CardContent className="pt-0">
                  <Button 
                    variant={step.highlight ? 'default' : 'outline'} 
                    size="sm" 
                    className="w-full gap-2"
                    onClick={() => step.route && navigate(step.route)}
                  >
                    {step.action}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> Use os dados de demonstração para entender o funcionamento antes de iniciar sua avaliação real.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            Recursos Principais
          </h2>
          <p className="text-muted-foreground">
            Tudo que você precisa para uma avaliação completa de segurança em IA
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="grid md:grid-cols-2 gap-8 items-center py-8">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">
            Por que usar esta ferramenta?
          </h2>
          <ul className="space-y-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">Cobertura Completa</span>
            </div>
            <CardTitle className="text-3xl">10 Domínios</CardTitle>
            <CardDescription>de segurança avaliados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 rounded-lg bg-background/50">
                <div className="text-2xl font-bold text-foreground">82</div>
                <div className="text-xs text-muted-foreground">Questões</div>
              </div>
              <div className="p-3 rounded-lg bg-background/50">
                <div className="text-2xl font-bold text-foreground">6+</div>
                <div className="text-xs text-muted-foreground">Frameworks</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Baseado em NIST AI RMF, ISO/IEC 42001, ISO 27001, LGPD, 
              regulamentações BACEN/CMN e EU AI Act.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="text-center py-12 px-6 rounded-xl bg-muted/50 border border-border">
        <h2 className="text-2xl font-semibold text-foreground mb-3">
          Pronto para começar?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
          Inicie sua avaliação agora e obtenha insights valiosos sobre a 
          maturidade de segurança em IA da sua organização.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={() => navigate('/assessment')} className="gap-2">
            Começar Avaliação
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/assessment')} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Experimentar com Demo
          </Button>
        </div>
      </section>
    </div>
  );
}
