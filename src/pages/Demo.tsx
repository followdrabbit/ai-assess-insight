import { useState, useEffect, useCallback } from 'react';
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
  Pause,
  Check,
  ArrowRight,
  Sparkles,
  Lock,
  TrendingUp,
  Users,
  Zap,
  Presentation,
  X,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Progress } from '@/components/ui/progress';
import { LanguageSelector } from '@/components/LanguageSelector';

// Import screenshots
import screenshotExecutive from '@/assets/screenshots/dashboard-executive.png';
import screenshotGRC from '@/assets/screenshots/dashboard-grc.png';
import screenshotSpecialist from '@/assets/screenshots/dashboard-specialist.png';
import screenshotAssessment from '@/assets/screenshots/assessment.png';
import screenshotAIAssistant from '@/assets/screenshots/ai-assistant.png';
import screenshotFrameworks from '@/assets/screenshots/frameworks.png';

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

// Presentation slide transition types
type TransitionType = 'fade' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'zoom' | 'rotate' | 'flip' | 'cube';

interface TransitionVariant {
  opacity: number;
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  rotateY?: number;
  transformOrigin?: string;
}

const slideTransitions: Record<TransitionType, {
  initial: TransitionVariant;
  animate: TransitionVariant;
  exit: TransitionVariant;
}> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideLeft: {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
  },
  slideRight: {
    initial: { opacity: 0, x: -100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 100 },
  },
  slideUp: {
    initial: { opacity: 0, y: 100 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -100 },
  },
  slideDown: {
    initial: { opacity: 0, y: -100 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 100 },
  },
  zoom: {
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.5 },
  },
  rotate: {
    initial: { opacity: 0, scale: 0.8, rotate: -10 },
    animate: { opacity: 1, scale: 1, rotate: 0 },
    exit: { opacity: 0, scale: 0.8, rotate: 10 },
  },
  flip: {
    initial: { opacity: 0, rotateY: 90 },
    animate: { opacity: 1, rotateY: 0 },
    exit: { opacity: 0, rotateY: -90 },
  },
  cube: {
    initial: { opacity: 0, rotateY: -90, transformOrigin: 'right center' },
    animate: { opacity: 1, rotateY: 0, transformOrigin: 'center center' },
    exit: { opacity: 0, rotateY: 90, transformOrigin: 'left center' },
  },
};

const transitionOptions: { value: TransitionType; label: string }[] = [
  { value: 'fade', label: 'Fade' },
  { value: 'slideLeft', label: 'Deslizar ←' },
  { value: 'slideRight', label: 'Deslizar →' },
  { value: 'slideUp', label: 'Deslizar ↑' },
  { value: 'slideDown', label: 'Deslizar ↓' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'rotate', label: 'Rotação' },
  { value: 'flip', label: 'Flip 3D' },
  { value: 'cube', label: 'Cubo 3D' },
];

interface Screenshot {
  id: string;
  title: string;
  description: string;
  category: 'dashboard' | 'assessment' | 'settings' | 'ai';
  icon: React.ReactNode;
  features: string[];
  image: string;
}

const screenshots: Screenshot[] = [
  {
    id: 'executive',
    title: 'Dashboard Executivo',
    description: 'Visão estratégica consolidada para CISO e liderança com KPIs de maturidade, cobertura e gaps críticos.',
    category: 'dashboard',
    icon: <BarChart3 className="h-6 w-6" />,
    image: screenshotExecutive,
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
    image: screenshotGRC,
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
    image: screenshotSpecialist,
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
    image: screenshotAssessment,
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
    image: screenshotAIAssistant,
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
    image: screenshotFrameworks,
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
  
  // Presentation mode state
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlayInterval, setAutoPlayInterval] = useState(5000); // 5 seconds default
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [transitionType, setTransitionType] = useState<TransitionType>('slideLeft');
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  const filteredScreenshots = activeCategory === 'all' 
    ? screenshots 
    : screenshots.filter(s => s.category === activeCategory);

  const nextScreenshot = useCallback(() => {
    setSlideDirection('next');
    setActiveScreenshot((prev) => (prev + 1) % filteredScreenshots.length);
    setProgress(0);
  }, [filteredScreenshots.length]);

  const prevScreenshot = useCallback(() => {
    setSlideDirection('prev');
    setActiveScreenshot((prev) => (prev - 1 + filteredScreenshots.length) % filteredScreenshots.length);
    setProgress(0);
  }, [filteredScreenshots.length]);

  // Auto-play effect
  useEffect(() => {
    if (!isAutoPlaying) {
      setProgress(0);
      return;
    }

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextScreenshot();
          return 0;
        }
        return prev + (100 / (autoPlayInterval / 100));
      });
    }, 100);

    return () => clearInterval(progressInterval);
  }, [isAutoPlaying, autoPlayInterval, nextScreenshot]);

  // Keyboard navigation for presentation mode
  useEffect(() => {
    if (!isPresentationMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          nextScreenshot();
          break;
        case 'ArrowLeft':
          prevScreenshot();
          break;
        case 'Escape':
          setIsPresentationMode(false);
          setIsAutoPlaying(false);
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          break;
        case 'p':
        case 'P':
          setIsAutoPlaying((prev) => !prev);
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresentationMode, nextScreenshot, prevScreenshot]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const startPresentationMode = () => {
    setIsPresentationMode(true);
    setIsAutoPlaying(true);
    setActiveScreenshot(0);
    setProgress(0);
  };

  const exitPresentationMode = () => {
    setIsPresentationMode(false);
    setIsAutoPlaying(false);
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setIsFullscreen(false);
  };

  // Lightbox functions
  const openLightbox = (src: string, title: string) => {
    setLightboxImage({ src, title });
    setLightboxZoom(1);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxImage(null);
    setLightboxZoom(1);
  };

  const zoomIn = () => setLightboxZoom((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setLightboxZoom((prev) => Math.max(prev - 0.25, 0.5));

  // Lightbox keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
          zoomOut();
          break;
        case 'ArrowRight':
          setSlideDirection('next');
          setActiveScreenshot((prev) => (prev + 1) % filteredScreenshots.length);
          setLightboxImage({
            src: filteredScreenshots[(activeScreenshot + 1) % filteredScreenshots.length]?.image,
            title: filteredScreenshots[(activeScreenshot + 1) % filteredScreenshots.length]?.title,
          });
          setLightboxZoom(1);
          break;
        case 'ArrowLeft':
          setSlideDirection('prev');
          setActiveScreenshot((prev) => (prev - 1 + filteredScreenshots.length) % filteredScreenshots.length);
          setLightboxImage({
            src: filteredScreenshots[(activeScreenshot - 1 + filteredScreenshots.length) % filteredScreenshots.length]?.image,
            title: filteredScreenshots[(activeScreenshot - 1 + filteredScreenshots.length) % filteredScreenshots.length]?.title,
          });
          setLightboxZoom(1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, activeScreenshot, filteredScreenshots]);

  // Lightbox Overlay
  const LightboxOverlay = () => {
    if (!lightboxOpen || !lightboxImage) return null;

    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeLightbox}
        >
          {/* Header Controls */}
          <motion.div
            className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <div className="flex items-center gap-3">
                <span className="text-white font-medium text-lg">{lightboxImage.title}</span>
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  {activeScreenshot + 1} / {filteredScreenshots.length}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 mr-2 bg-white/10 rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); zoomOut(); }}
                    disabled={lightboxZoom <= 0.5}
                    className="text-white hover:bg-white/20 h-8 w-8"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-white text-sm min-w-[3rem] text-center">
                    {Math.round(lightboxZoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); zoomIn(); }}
                    disabled={lightboxZoom >= 3}
                    className="text-white hover:bg-white/20 h-8 w-8"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>

                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeLightbox}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Image Container */}
          <motion.div
            className="relative max-w-[90vw] max-h-[80vh] cursor-zoom-out"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.img
              src={lightboxImage.src}
              alt={lightboxImage.title}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              style={{ transform: `scale(${lightboxZoom})` }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              drag={lightboxZoom > 1}
              dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
            />
          </motion.div>

          {/* Navigation Arrows */}
          <motion.div
            className="absolute left-4 top-1/2 -translate-y-1/2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              variant="ghost"
              size="lg"
              className="rounded-full bg-white/10 hover:bg-white/20 text-white h-14 w-14"
              onClick={(e) => {
                e.stopPropagation();
                const newIndex = (activeScreenshot - 1 + filteredScreenshots.length) % filteredScreenshots.length;
                setActiveScreenshot(newIndex);
                setLightboxImage({
                  src: filteredScreenshots[newIndex]?.image,
                  title: filteredScreenshots[newIndex]?.title,
                });
                setLightboxZoom(1);
              }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </motion.div>
          <motion.div
            className="absolute right-4 top-1/2 -translate-y-1/2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              variant="ghost"
              size="lg"
              className="rounded-full bg-white/10 hover:bg-white/20 text-white h-14 w-14"
              onClick={(e) => {
                e.stopPropagation();
                const newIndex = (activeScreenshot + 1) % filteredScreenshots.length;
                setActiveScreenshot(newIndex);
                setLightboxImage({
                  src: filteredScreenshots[newIndex]?.image,
                  title: filteredScreenshots[newIndex]?.title,
                });
                setLightboxZoom(1);
              }}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </motion.div>

          {/* Footer with thumbnails */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center gap-2 overflow-x-auto pb-2">
              {filteredScreenshots.map((screenshot, index) => (
                <motion.button
                  key={index}
                  onClick={() => {
                    setActiveScreenshot(index);
                    setLightboxImage({ src: screenshot.image, title: screenshot.title });
                    setLightboxZoom(1);
                  }}
                  className={`relative flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    index === activeScreenshot 
                      ? 'border-primary ring-2 ring-primary/50' 
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <img
                    src={screenshot.image}
                    alt={screenshot.title}
                    className="w-20 h-14 object-cover"
                  />
                </motion.button>
              ))}
            </div>
            <p className="text-center text-xs text-white/60 mt-2">
              Use <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs">←</kbd> <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs">→</kbd> para navegar, 
              <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs ml-1">+</kbd> <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs">-</kbd> para zoom, 
              <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs ml-1">ESC</kbd> para fechar
            </p>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  // Presentation Mode Overlay
  if (isPresentationMode) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        {/* Header Controls */}
        <motion.div 
          className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-background/90 to-transparent"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">TrustLayer</span>
              <Badge variant="secondary">Modo Apresentação</Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Transition Type Selector */}
              <div className="flex items-center gap-2 mr-2">
                <span className="text-sm text-muted-foreground hidden lg:inline">Transição:</span>
                <select
                  value={transitionType}
                  onChange={(e) => setTransitionType(e.target.value as TransitionType)}
                  className="bg-background border rounded-md px-2 py-1 text-sm"
                >
                  {transitionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Speed Control */}
              <div className="flex items-center gap-2 mr-2">
                <span className="text-sm text-muted-foreground hidden lg:inline">Velocidade:</span>
                <div className="flex gap-1">
                  {[3000, 5000, 8000].map((speed) => (
                    <Button
                      key={speed}
                      variant={autoPlayInterval === speed ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAutoPlayInterval(speed)}
                      className="text-xs px-2"
                    >
                      {speed / 1000}s
                    </Button>
                  ))}
                </div>
              </div>

              {/* Play/Pause */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              >
                {isAutoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>

              {/* Fullscreen Toggle */}
              <Button
                variant="outline"
                size="icon"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>

              {/* Exit */}
              <Button
                variant="outline"
                size="icon"
                onClick={exitPresentationMode}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          {isAutoPlaying && (
            <div className="max-w-6xl mx-auto mt-3">
              <Progress value={progress} className="h-1" />
            </div>
          )}
        </motion.div>

        {/* Main Content */}
        <div className="flex items-center justify-center h-full pt-20 pb-24 px-8" style={{ perspective: '1200px' }}>
          <AnimatePresence mode="wait" custom={slideDirection}>
            <motion.div
              key={activeScreenshot}
              custom={slideDirection}
              initial={slideTransitions[transitionType].initial as any}
              animate={slideTransitions[transitionType].animate as any}
              exit={slideTransitions[transitionType].exit as any}
              transition={{ 
                duration: 0.5, 
                ease: [0.4, 0, 0.2, 1],
              }}
              className="max-w-5xl w-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <Card className="overflow-hidden shadow-2xl">
                <div className="grid md:grid-cols-2 min-h-[500px]">
                  {/* Screenshot Image */}
                  <motion.div 
                    className="relative overflow-hidden bg-muted/30 cursor-pointer group"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15, duration: 0.4 }}
                    onClick={() => {
                      setIsAutoPlaying(false);
                      openLightbox(
                        filteredScreenshots[activeScreenshot]?.image,
                        filteredScreenshots[activeScreenshot]?.title
                      );
                    }}
                  >
                    <motion.img 
                      src={filteredScreenshots[activeScreenshot]?.image}
                      alt={filteredScreenshots[activeScreenshot]?.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.6 }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
                    {/* Zoom hint overlay */}
                    <motion.div 
                      className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                    >
                      <motion.div
                        className="bg-white/90 dark:bg-black/90 rounded-full p-3 shadow-lg"
                        initial={{ scale: 0 }}
                        whileHover={{ scale: 1 }}
                      >
                        <ZoomIn className="h-6 w-6 text-primary" />
                      </motion.div>
                    </motion.div>
                  </motion.div>

                  {/* Description */}
                  <motion.div 
                    className="p-12 flex flex-col justify-center"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                    >
                      <Badge variant="outline" className="w-fit mb-4 text-sm">
                        {filteredScreenshots[activeScreenshot]?.category === 'dashboard' && 'Dashboard'}
                        {filteredScreenshots[activeScreenshot]?.category === 'assessment' && 'Avaliação'}
                        {filteredScreenshots[activeScreenshot]?.category === 'ai' && 'Inteligência Artificial'}
                        {filteredScreenshots[activeScreenshot]?.category === 'settings' && 'Configurações'}
                      </Badge>
                    </motion.div>
                    <motion.h3 
                      className="text-3xl font-bold mb-4"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                    >
                      {filteredScreenshots[activeScreenshot]?.title}
                    </motion.h3>
                    <motion.p 
                      className="text-muted-foreground mb-8 text-lg"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35, duration: 0.4 }}
                    >
                      {filteredScreenshots[activeScreenshot]?.description}
                    </motion.p>
                    <ul className="space-y-3">
                      {filteredScreenshots[activeScreenshot]?.features.map((feature, idx) => (
                        <motion.li 
                          key={feature} 
                          className="flex items-center gap-3 text-base"
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + idx * 0.08, duration: 0.3 }}
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.45 + idx * 0.08, type: "spring", stiffness: 500 }}
                          >
                            <Check className="h-5 w-5 text-primary flex-shrink-0" />
                          </motion.div>
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
            className="absolute left-8 top-1/2 -translate-y-1/2"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              variant="outline"
              size="lg"
              className="rounded-full shadow-lg h-14 w-14"
              onClick={prevScreenshot}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </motion.div>
          <motion.div
            className="absolute right-8 top-1/2 -translate-y-1/2"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              variant="outline"
              size="lg"
              className="rounded-full shadow-lg h-14 w-14"
              onClick={nextScreenshot}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </motion.div>
        </div>

        {/* Footer with slide indicators */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background/90 to-transparent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              {filteredScreenshots.map((screenshot, index) => (
                <motion.button
                  key={index}
                  onClick={() => { setActiveScreenshot(index); setProgress(0); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    index === activeScreenshot 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-sm font-medium">{index + 1}</span>
                  <span className="text-xs hidden sm:inline">{screenshot.title}</span>
                </motion.button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Use as teclas <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">←</kbd> <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">→</kbd> para navegar, 
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs ml-1">P</kbd> para play/pause, 
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs ml-1">F</kbd> para tela cheia, 
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs ml-1">ESC</kbd> para sair
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <LightboxOverlay />
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

          {/* Presentation Mode Button */}
          <motion.div
            className="flex justify-center mb-6"
            variants={fadeIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Button
              size="lg"
              onClick={startPresentationMode}
              className="gap-2"
            >
              <Presentation className="h-5 w-5" />
              Modo Apresentação
              <Badge variant="secondary" className="ml-1 text-xs">Auto-play</Badge>
            </Button>
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
                      {/* Screenshot Image */}
                      <motion.div 
                        className="relative overflow-hidden min-h-[400px] bg-muted/30 cursor-pointer group"
                        variants={slideInLeft}
                        initial="hidden"
                        animate="visible"
                        transition={{ duration: 0.5 }}
                        onClick={() => openLightbox(
                          filteredScreenshots[activeScreenshot]?.image,
                          filteredScreenshots[activeScreenshot]?.title
                        )}
                      >
                        <motion.img 
                          src={filteredScreenshots[activeScreenshot]?.image}
                          alt={filteredScreenshots[activeScreenshot]?.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          initial={{ scale: 1.1 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.6 }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/10" />
                        {/* Zoom hint overlay */}
                        <motion.div 
                          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors"
                          initial={{ opacity: 0 }}
                          whileHover={{ opacity: 1 }}
                        >
                          <motion.div
                            className="bg-white/90 dark:bg-black/90 rounded-full p-3 shadow-lg"
                            initial={{ scale: 0 }}
                            whileHover={{ scale: 1 }}
                          >
                            <ZoomIn className="h-6 w-6 text-primary" />
                          </motion.div>
                        </motion.div>
                        <motion.div 
                          className="absolute top-4 left-4 w-12 h-12 rounded-xl bg-background/90 backdrop-blur flex items-center justify-center text-primary shadow-lg"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ duration: 0.5, type: "spring", delay: 0.2 }}
                        >
                          {filteredScreenshots[activeScreenshot]?.icon}
                        </motion.div>
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
    </>
  );
}
