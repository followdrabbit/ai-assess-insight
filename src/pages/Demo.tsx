import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0 },
};

const slideInRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
};

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

const features = [
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
          >
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">TrustLayer</span>
            <Badge variant="secondary" className="ml-2">Demo</Badge>
          </motion.div>
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
      </motion.header>

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-background relative overflow-hidden">
        {/* Animated background elements */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"
            animate={{ 
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
            animate={{ 
              x: [0, -30, 0],
              y: [0, 20, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        <div className="container mx-auto text-center max-w-4xl relative z-10">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              Plataforma de Governança de Segurança
            </Badge>
          </motion.div>

          <motion.h1 
            className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Avalie e Eleve sua Postura de Segurança
          </motion.h1>

          <motion.p 
            className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Plataforma completa para avaliação de maturidade em AI Security, Cloud Security e DevSecOps 
            com dashboards especializados e assistente de IA integrado.
          </motion.p>

          <motion.div 
            className="flex flex-wrap gap-4 justify-center"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" asChild>
                <Link to="/signup">
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Avaliação
                </Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">
                  Acessar com Demo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          <motion.p 
            className="text-sm text-muted-foreground mt-4"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Lock className="h-3 w-3 inline mr-1" />
            Conta demo: demo@aiassess.app / Demo@2025!
          </motion.p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {stats.map((stat, index) => (
              <motion.div 
                key={stat.label} 
                className="text-center"
                variants={scaleIn}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <motion.div 
                  className="flex justify-center mb-2 text-primary"
                  whileHover={{ scale: 1.2, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {stat.icon}
                </motion.div>
                <motion.div 
                  className="text-3xl font-bold"
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1, type: "spring" }}
                >
                  {stat.value}
                </motion.div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Security Domains */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-12"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold mb-4">Domínios de Segurança</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Avalie sua organização em três domínios críticos de segurança, 
              cada um com frameworks e questões especializadas.
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {securityDomains.map((domain, index) => (
              <motion.div
                key={domain.id}
                variants={fadeInUp}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
              >
                <Card className="relative overflow-hidden group hover:shadow-xl transition-shadow h-full">
                  <motion.div 
                    className={`absolute inset-0 bg-gradient-to-br ${domain.color} opacity-5`}
                    whileHover={{ opacity: 0.15 }}
                    transition={{ duration: 0.3 }}
                  />
                  <CardHeader>
                    <motion.div 
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${domain.color} flex items-center justify-center text-white mb-4`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      {domain.icon}
                    </motion.div>
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
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Interactive Screenshots */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-12"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold mb-4">Explore as Funcionalidades</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Conheça os principais recursos da plataforma através de uma galeria interativa.
            </p>
          </motion.div>

          {/* Category Tabs */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Tabs value={activeCategory} onValueChange={(v) => { setActiveCategory(v); setActiveScreenshot(0); }} className="mb-8">
              <TabsList className="grid w-full max-w-lg mx-auto grid-cols-5">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="dashboard">Dashboards</TabsTrigger>
                <TabsTrigger value="assessment">Avaliação</TabsTrigger>
                <TabsTrigger value="ai">IA</TabsTrigger>
                <TabsTrigger value="settings">Config</TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>

          {/* Screenshot Carousel */}
          <div className="max-w-5xl mx-auto">
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeCategory}-${activeScreenshot}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden">
                    <div className="grid md:grid-cols-2">
                      {/* Visual Preview */}
                      <motion.div 
                        className="bg-gradient-to-br from-primary/10 to-primary/5 p-8 flex items-center justify-center min-h-[400px]"
                        variants={slideInLeft}
                        initial="hidden"
                        animate="visible"
                        transition={{ duration: 0.5 }}
                      >
                        <div className="text-center">
                          <motion.div 
                            className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 text-primary"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ duration: 0.5, type: "spring" }}
                          >
                            {filteredScreenshots[activeScreenshot]?.icon}
                          </motion.div>
                          <div className="w-full max-w-sm mx-auto">
                            {/* Simulated UI Preview */}
                            <motion.div 
                              className="bg-background rounded-lg shadow-xl p-4 space-y-3"
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ duration: 0.5, delay: 0.2 }}
                            >
                              <div className="flex items-center gap-2">
                                <motion.div 
                                  className="w-3 h-3 rounded-full bg-red-400"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.3 }}
                                />
                                <motion.div 
                                  className="w-3 h-3 rounded-full bg-yellow-400"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.35 }}
                                />
                                <motion.div 
                                  className="w-3 h-3 rounded-full bg-green-400"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.4 }}
                                />
                                <motion.div 
                                  className="flex-1 h-4 bg-muted rounded ml-2"
                                  initial={{ scaleX: 0 }}
                                  animate={{ scaleX: 1 }}
                                  transition={{ delay: 0.45 }}
                                />
                              </div>
                              <motion.div 
                                className="h-3 bg-muted rounded w-3/4"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ delay: 0.5 }}
                                style={{ originX: 0 }}
                              />
                              <motion.div 
                                className="h-3 bg-muted rounded w-1/2"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ delay: 0.55 }}
                                style={{ originX: 0 }}
                              />
                              <motion.div 
                                className="grid grid-cols-3 gap-2 mt-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                              >
                                <motion.div 
                                  className="h-16 bg-primary/10 rounded"
                                  whileHover={{ scale: 1.05 }}
                                />
                                <motion.div 
                                  className="h-16 bg-primary/20 rounded"
                                  whileHover={{ scale: 1.05 }}
                                />
                                <motion.div 
                                  className="h-16 bg-primary/10 rounded"
                                  whileHover={{ scale: 1.05 }}
                                />
                              </motion.div>
                              <motion.div 
                                className="h-24 bg-muted/50 rounded mt-2"
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: 1 }}
                                transition={{ delay: 0.7 }}
                                style={{ originY: 0 }}
                              />
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Description */}
                      <motion.div 
                        className="p-8 flex flex-col justify-center"
                        variants={slideInRight}
                        initial="hidden"
                        animate="visible"
                        transition={{ duration: 0.5 }}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          <Badge variant="outline" className="w-fit mb-4">
                            {filteredScreenshots[activeScreenshot]?.category === 'dashboard' && 'Dashboard'}
                            {filteredScreenshots[activeScreenshot]?.category === 'assessment' && 'Avaliação'}
                            {filteredScreenshots[activeScreenshot]?.category === 'ai' && 'Inteligência Artificial'}
                            {filteredScreenshots[activeScreenshot]?.category === 'settings' && 'Configurações'}
                          </Badge>
                        </motion.div>
                        <motion.h3 
                          className="text-2xl font-bold mb-3"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          {filteredScreenshots[activeScreenshot]?.title}
                        </motion.h3>
                        <motion.p 
                          className="text-muted-foreground mb-6"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          {filteredScreenshots[activeScreenshot]?.description}
                        </motion.p>
                        <ul className="space-y-2">
                          {filteredScreenshots[activeScreenshot]?.features.map((feature, idx) => (
                            <motion.li 
                              key={feature} 
                              className="flex items-center gap-2 text-sm"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 + idx * 0.1 }}
                            >
                              <Check className="h-4 w-4 text-primary" />
                              {feature}
                            </motion.li>
                          ))}
                        </ul>
                      </motion.div>
                    </div>
                  </Card>
                </motion.div>
              </AnimatePresence>

              {/* Navigation Arrows */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute left-4 top-1/2 -translate-y-1/2"
              >
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full shadow-lg"
                  onClick={prevScreenshot}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full shadow-lg"
                  onClick={nextScreenshot}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-6">
              {filteredScreenshots.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={() => setActiveScreenshot(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === activeScreenshot ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                  whileHover={{ scale: 1.5 }}
                  whileTap={{ scale: 0.8 }}
                  animate={index === activeScreenshot ? { scale: 1.3 } : { scale: 1 }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-12"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold mb-4">Por que TrustLayer?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Uma plataforma completa para elevar a maturidade de segurança da sua organização.
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={scaleIn}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <Card className="hover:shadow-lg transition-shadow h-full">
                  <CardHeader>
                    <motion.div 
                      className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      {feature.icon}
                    </motion.div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <motion.section 
        className="py-20 px-4 bg-primary text-primary-foreground"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto text-center max-w-3xl">
          <motion.h2 
            className="text-3xl font-bold mb-4"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Pronto para Elevar sua Segurança?
          </motion.h2>
          <motion.p 
            className="text-primary-foreground/80 mb-8 text-lg"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Comece sua avaliação agora e descubra como melhorar a postura de segurança da sua organização.
          </motion.p>
          <motion.div 
            className="flex flex-wrap gap-4 justify-center"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" variant="secondary" asChild>
                <Link to="/signup">
                  Criar Conta Gratuita
                </Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10" asChild>
                <Link to="/login">
                  Acessar Demo
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer 
        className="py-12 px-4 border-t"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
            >
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-semibold">TrustLayer</span>
            </motion.div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <motion.a 
                href="https://github.com/seu-usuario/trustlayer" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-foreground transition-colors"
                whileHover={{ scale: 1.05 }}
              >
                GitHub
              </motion.a>
              <motion.a 
                href="/docs/API.md" 
                className="hover:text-foreground transition-colors"
                whileHover={{ scale: 1.05 }}
              >
                API Docs
              </motion.a>
              <motion.a 
                href="/docs/ARCHITECTURE.md" 
                className="hover:text-foreground transition-colors"
                whileHover={{ scale: 1.05 }}
              >
                Arquitetura
              </motion.a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 TrustLayer. MIT License.
            </p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
