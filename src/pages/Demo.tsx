import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  BarChart3, 
  FileCheck, 
  Settings, 
  Bot, 
  Globe,
  ChevronLeft,
  ChevronRight,
  Play,
  Check,
  ArrowRight,
  Sparkles,
  Lock,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';

interface Screenshot {
  id: string;
  title: string;
  description: string;
  category: 'dashboard' | 'assessment' | 'settings' | 'ai';
  icon: React.ReactNode;
  features: string[];
}

const screenshots: Screenshot[] = [
  {
    id: 'executive',
    title: 'Dashboard Executivo',
    description: 'Visão estratégica consolidada para CISO e liderança com KPIs de maturidade, cobertura e gaps críticos.',
    category: 'dashboard',
    icon: <BarChart3 className="h-6 w-6" />,
    features: [
      'Score de maturidade geral',
      'Gráfico de evolução temporal',
      'Top 5 gaps críticos',
      'Roadmap estratégico 30/60/90 dias',
      'Comparação de períodos',
    ],
  },
  {
    id: 'grc',
    title: 'Dashboard GRC',
    description: 'Governança, Riscos e Compliance com foco em cobertura de frameworks e conformidade regulatória.',
    category: 'dashboard',
    icon: <FileCheck className="h-6 w-6" />,
    features: [
      'Cobertura por framework',
      'Distribuição de respostas',
      'Métricas de evidência',
      'Análise de criticidade',
      'Indicadores NIST/CSA/OWASP',
    ],
  },
  {
    id: 'specialist',
    title: 'Dashboard Especialista',
    description: 'Detalhes técnicos para arquitetos e engenheiros de segurança com métricas granulares.',
    category: 'dashboard',
    icon: <Settings className="h-6 w-6" />,
    features: [
      'Métricas por categoria',
      'Análise de ownership',
      'Gaps por domínio L2',
      'Prontidão de evidências',
      'Tendências históricas',
    ],
  },
  {
    id: 'assessment',
    title: 'Avaliação de Segurança',
    description: 'Questionário estruturado por taxonomia L1/L2 com campos de evidência e notas contextuais.',
    category: 'assessment',
    icon: <Shield className="h-6 w-6" />,
    features: [
      'Questões categorizadas',
      'Respostas Sim/Parcial/Não/NA',
      'Campos de evidência',
      'Links de referência',
      'Notas e observações',
    ],
  },
  {
    id: 'ai-assistant',
    title: 'Assistente de IA',
    description: 'Chat interativo com análise contextual do assessment e suporte a comandos de voz.',
    category: 'ai',
    icon: <Bot className="h-6 w-6" />,
    features: [
      'Análise de gaps',
      'Recomendações priorizadas',
      'Múltiplos provedores',
      'Comandos de voz',
      'Contexto do assessment',
    ],
  },
  {
    id: 'frameworks',
    title: 'Gestão de Frameworks',
    description: 'Configure e customize frameworks de segurança conforme as necessidades da organização.',
    category: 'settings',
    icon: <Globe className="h-6 w-6" />,
    features: [
      'NIST AI RMF',
      'ISO 27001/27002',
      'CSA CCM v4',
      'OWASP SAMM',
      'Frameworks customizados',
    ],
  },
];

const securityDomains = [
  {
    id: 'ai-security',
    name: 'AI Security',
    description: 'Governança de sistemas de IA',
    icon: <Sparkles className="h-8 w-8" />,
    color: 'from-violet-500 to-purple-600',
    frameworks: ['NIST AI RMF', 'ISO/IEC 42001', 'EU AI Act'],
    questions: 143,
  },
  {
    id: 'cloud-security',
    name: 'Cloud Security',
    description: 'Segurança em nuvem',
    icon: <Shield className="h-8 w-8" />,
    color: 'from-blue-500 to-cyan-600',
    frameworks: ['CSA CCM', 'CIS Controls', 'ISO 27017'],
    questions: 36,
  },
  {
    id: 'devsecops',
    name: 'DevSecOps',
    description: 'Segurança no ciclo de desenvolvimento',
    icon: <Zap className="h-8 w-8" />,
    color: 'from-orange-500 to-amber-600',
    frameworks: ['NIST SSDF', 'OWASP SAMM', 'CIS Controls'],
    questions: 44,
  },
];

const stats = [
  { label: 'Questões de Segurança', value: '223+', icon: <FileCheck className="h-5 w-5" /> },
  { label: 'Frameworks Suportados', value: '10+', icon: <Shield className="h-5 w-5" /> },
  { label: 'Domínios de Segurança', value: '3', icon: <Globe className="h-5 w-5" /> },
  { label: 'Idiomas Disponíveis', value: '3', icon: <Users className="h-5 w-5" /> },
];

export default function Demo() {
  const { t } = useTranslation();
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredScreenshots = activeCategory === 'all' 
    ? screenshots 
    : screenshots.filter(s => s.category === activeCategory);

  const nextScreenshot = () => {
    setActiveScreenshot((prev) => (prev + 1) % filteredScreenshots.length);
  };

  const prevScreenshot = () => {
    setActiveScreenshot((prev) => (prev - 1 + filteredScreenshots.length) % filteredScreenshots.length);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">TrustLayer</span>
            <Badge variant="secondary" className="ml-2">Demo</Badge>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
            <Button variant="outline" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Começar Grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="outline" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            Plataforma de Governança de Segurança
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Avalie e Eleve sua Postura de Segurança
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Plataforma completa para avaliação de maturidade em AI Security, Cloud Security e DevSecOps 
            com dashboards especializados e assistente de IA integrado.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/signup">
                <Play className="h-4 w-4 mr-2" />
                Iniciar Avaliação
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">
                Acessar com Demo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            <Lock className="h-3 w-3 inline mr-1" />
            Conta demo: demo@aiassess.app / Demo@2025!
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex justify-center mb-2 text-primary">{stat.icon}</div>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Domains */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Domínios de Segurança</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Avalie sua organização em três domínios críticos de segurança, 
              cada um com frameworks e questões especializadas.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {securityDomains.map((domain) => (
              <Card key={domain.id} className="relative overflow-hidden group hover:shadow-lg transition-shadow">
                <div className={`absolute inset-0 bg-gradient-to-br ${domain.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
                <CardHeader>
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${domain.color} flex items-center justify-center text-white mb-4`}>
                    {domain.icon}
                  </div>
                  <CardTitle>{domain.name}</CardTitle>
                  <CardDescription>{domain.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <FileCheck className="h-4 w-4 text-muted-foreground" />
                      <span>{domain.questions} questões de avaliação</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {domain.frameworks.map((fw) => (
                        <Badge key={fw} variant="secondary" className="text-xs">
                          {fw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Screenshots */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Explore as Funcionalidades</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Conheça os principais recursos da plataforma através de uma galeria interativa.
            </p>
          </div>

          {/* Category Tabs */}
          <Tabs value={activeCategory} onValueChange={(v) => { setActiveCategory(v); setActiveScreenshot(0); }} className="mb-8">
            <TabsList className="grid w-full max-w-lg mx-auto grid-cols-5">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboards</TabsTrigger>
              <TabsTrigger value="assessment">Avaliação</TabsTrigger>
              <TabsTrigger value="ai">IA</TabsTrigger>
              <TabsTrigger value="settings">Config</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Screenshot Carousel */}
          <div className="max-w-5xl mx-auto">
            <div className="relative">
              {/* Main Screenshot Card */}
              <Card className="overflow-hidden">
                <div className="grid md:grid-cols-2">
                  {/* Visual Preview */}
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-8 flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 text-primary">
                        {filteredScreenshots[activeScreenshot]?.icon}
                      </div>
                      <div className="w-full max-w-sm mx-auto">
                        {/* Simulated UI Preview */}
                        <div className="bg-background rounded-lg shadow-xl p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-400" />
                            <div className="w-3 h-3 rounded-full bg-yellow-400" />
                            <div className="w-3 h-3 rounded-full bg-green-400" />
                            <div className="flex-1 h-4 bg-muted rounded ml-2" />
                          </div>
                          <div className="h-3 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                          <div className="grid grid-cols-3 gap-2 mt-4">
                            <div className="h-16 bg-primary/10 rounded" />
                            <div className="h-16 bg-primary/20 rounded" />
                            <div className="h-16 bg-primary/10 rounded" />
                          </div>
                          <div className="h-24 bg-muted/50 rounded mt-2" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="p-8 flex flex-col justify-center">
                    <Badge variant="outline" className="w-fit mb-4">
                      {filteredScreenshots[activeScreenshot]?.category === 'dashboard' && 'Dashboard'}
                      {filteredScreenshots[activeScreenshot]?.category === 'assessment' && 'Avaliação'}
                      {filteredScreenshots[activeScreenshot]?.category === 'ai' && 'Inteligência Artificial'}
                      {filteredScreenshots[activeScreenshot]?.category === 'settings' && 'Configurações'}
                    </Badge>
                    <h3 className="text-2xl font-bold mb-3">
                      {filteredScreenshots[activeScreenshot]?.title}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {filteredScreenshots[activeScreenshot]?.description}
                    </p>
                    <ul className="space-y-2">
                      {filteredScreenshots[activeScreenshot]?.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Navigation Arrows */}
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full shadow-lg"
                onClick={prevScreenshot}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full shadow-lg"
                onClick={nextScreenshot}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-6">
              {filteredScreenshots.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveScreenshot(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === activeScreenshot ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Por que TrustLayer?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Uma plataforma completa para elevar a maturidade de segurança da sua organização.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <BarChart3 className="h-6 w-6" />,
                title: 'Dashboards Especializados',
                description: 'Três visões distintas para Executivos, GRC e Especialistas técnicos.',
              },
              {
                icon: <TrendingUp className="h-6 w-6" />,
                title: 'Análise de Tendências',
                description: 'Acompanhe a evolução da maturidade com snapshots automáticos e comparação de períodos.',
              },
              {
                icon: <Bot className="h-6 w-6" />,
                title: 'Assistente de IA',
                description: 'Chat inteligente com contexto do assessment e suporte a comandos de voz.',
              },
              {
                icon: <Shield className="h-6 w-6" />,
                title: 'Multi-Framework',
                description: 'Suporte a NIST, ISO, CSA, OWASP e frameworks customizados.',
              },
              {
                icon: <Globe className="h-6 w-6" />,
                title: 'Multi-Idioma',
                description: 'Interface em Português, Inglês e Espanhol com sincronização de preferências.',
              },
              {
                icon: <Lock className="h-6 w-6" />,
                title: 'Segurança Robusta',
                description: 'RLS, auditoria completa e integração com sistemas SIEM.',
              },
            ].map((feature) => (
              <Card key={feature.title} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para Elevar sua Segurança?
          </h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            Comece sua avaliação agora e descubra como melhorar a postura de segurança da sua organização.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/signup">
                Criar Conta Gratuita
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10" asChild>
              <Link to="/login">
                Acessar Demo
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-semibold">TrustLayer</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="https://github.com/seu-usuario/trustlayer" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                GitHub
              </a>
              <a href="/docs/API.md" className="hover:text-foreground transition-colors">
                API Docs
              </a>
              <a href="/docs/ARCHITECTURE.md" className="hover:text-foreground transition-colors">
                Arquitetura
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 TrustLayer. MIT License.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
