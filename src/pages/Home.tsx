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
    title: '100% Offline',
    description: 'Dados armazenados localmente no navegador. Nenhuma informação é enviada para servidores externos.',
  },
];

const benefits = [
  'Alinhamento com NIST AI RMF, ISO 42001, LGPD e regulamentações BACEN',
  'Identificação de gaps críticos de segurança em IA',
  'Roadmap priorizado 30/60/90 dias',
  'Métricas de maturidade por domínio e framework',
  'Suporte a múltiplos perfis de stakeholders',
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
        <Button size="lg" onClick={() => navigate('/assessment')} className="gap-2">
          Começar Avaliação Gratuita
          <ArrowRight className="h-4 w-4" />
        </Button>
      </section>
    </div>
  );
}
