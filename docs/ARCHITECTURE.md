# 🏗️ TrustLayer - Arquitetura do Sistema

Documentação técnica da arquitetura da plataforma TrustLayer de Governança de Segurança Multi-Domínio.

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura de Alto Nível](#arquitetura-de-alto-nível)
- [Camadas da Aplicação](#camadas-da-aplicação)
- [Fluxo de Dados](#fluxo-de-dados)
- [Modelo de Dados](#modelo-de-dados)
- [Componentes do Frontend](#componentes-do-frontend)
- [Edge Functions](#edge-functions)
- [Segurança](#segurança)
- [Integrações](#integrações)

---

## 🎯 Visão Geral

TrustLayer é uma plataforma SPA (Single Page Application) construída com React e TypeScript, utilizando Supabase como backend-as-a-service para persistência, autenticação e funções serverless.

### Princípios Arquiteturais

- **Multi-Tenant**: Isolamento de dados por usuário via RLS (Row Level Security)
- **Multi-Domínio**: Separação lógica de AI Security, Cloud Security e DevSecOps
- **Offline-First**: Cache local com Zustand para resiliência
- **Event-Driven**: Sistema de auditoria baseado em eventos
- **Modular**: Componentes reutilizáveis e hooks customizados

---

## 🏛️ Arquitetura de Alto Nível

```mermaid
graph TB
    subgraph "Cliente (Browser)"
        UI[React SPA]
        State[Zustand Store]
        Cache[Local Cache]
    end

    subgraph "CDN / Edge"
        Static[Assets Estáticos]
        Preview[Preview Environment]
    end

    subgraph "Supabase Cloud"
        Auth[Auth Service]
        DB[(PostgreSQL)]
        Storage[File Storage]
        
        subgraph "Edge Functions"
            EF1[ai-assistant]
            EF2[audit-log]
            EF3[siem-forward]
            EF4[init-demo-user]
            EF5[init-demo-data]
        end
    end

    subgraph "Serviços Externos"
        AI[AI Providers]
        SIEM[SIEM Systems]
        GEO[GeoIP Service]
    end

    UI --> Static
    UI <--> Auth
    UI <--> DB
    UI --> State
    State --> Cache
    
    UI --> EF1
    UI --> EF2
    
    EF1 --> AI
    EF2 --> GEO
    EF3 --> SIEM
    
    EF1 --> DB
    EF2 --> DB
    EF3 --> DB
```

---

## 📚 Camadas da Aplicação

```mermaid
graph LR
    subgraph "Presentation Layer"
        Pages[Pages]
        Components[Components]
        UI[UI Library]
    end

    subgraph "Application Layer"
        Hooks[Custom Hooks]
        Context[React Context]
        i18n[Internationalization]
    end

    subgraph "Domain Layer"
        Scoring[Scoring Engine]
        Frameworks[Framework Manager]
        Domains[Domain Manager]
    end

    subgraph "Infrastructure Layer"
        Supabase[Supabase Client]
        Store[Zustand Store]
        Export[Export Utils]
    end

    Pages --> Components
    Components --> UI
    Components --> Hooks
    Hooks --> Context
    Hooks --> Scoring
    Scoring --> Frameworks
    Frameworks --> Domains
    Hooks --> Supabase
    Hooks --> Store
```

### Estrutura de Diretórios

```
src/
├── components/           # Componentes React
│   ├── ui/              # shadcn/ui components
│   ├── dashboard/       # Dashboard components
│   ├── settings/        # Settings components
│   ├── ai-assistant/    # AI Assistant components
│   └── auth/            # Auth components
├── pages/               # Route pages
├── hooks/               # Custom React hooks
├── lib/                 # Business logic & utilities
├── data/                # Static JSON data
├── i18n/                # Internationalization
└── integrations/        # External integrations
```

---

## 🔄 Fluxo de Dados

### Assessment Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as React UI
    participant H as useDashboardMetrics
    participant S as Supabase
    participant DB as PostgreSQL

    U->>UI: Seleciona Domínio
    UI->>H: setSelectedSecurityDomain()
    H->>S: Fetch questions, frameworks
    S->>DB: SELECT with RLS
    DB-->>S: Filtered data
    S-->>H: Questions, Frameworks
    H->>H: Calculate metrics
    H-->>UI: Render dashboard
    
    U->>UI: Responde questão
    UI->>S: Upsert answer
    S->>DB: INSERT/UPDATE
    DB-->>S: Success
    S-->>UI: Updated answer
    UI->>H: Recalculate metrics
```

### AI Assistant Flow

```mermaid
sequenceDiagram
    participant U as User
    participant Chat as AIAssistantChat
    participant Hook as useAIAssistant
    participant EF as Edge Function
    participant AI as AI Provider

    U->>Chat: Envia mensagem
    Chat->>Hook: sendMessage(content)
    Hook->>Hook: buildContext()
    Hook->>EF: POST /ai-assistant
    EF->>EF: Get provider config
    EF->>AI: Stream request
    
    loop Streaming
        AI-->>EF: Token chunk
        EF-->>Hook: SSE data
        Hook-->>Chat: Update message
    end
    
    AI-->>EF: [DONE]
    EF-->>Hook: Stream complete
    Hook-->>Chat: Final render
```

### Audit & SIEM Flow

```mermaid
sequenceDiagram
    participant UI as React UI
    participant AL as auditLog()
    participant EF1 as audit-log
    participant GEO as ip-api.com
    participant DB as PostgreSQL
    participant EF2 as siem-forward
    participant SIEM as SIEM System

    UI->>AL: logChange(entity, action)
    AL->>EF1: POST /audit-log
    EF1->>EF1: Parse headers (IP, UA)
    EF1->>GEO: GET geolocation
    GEO-->>EF1: Country, City
    EF1->>DB: INSERT change_logs
    DB-->>EF1: Log ID
    EF1-->>AL: Success + geo
    
    Note over EF1,EF2: Async trigger
    
    EF1->>EF2: Forward event
    EF2->>DB: Get SIEM integrations
    DB-->>EF2: Active integrations
    
    loop Each Integration
        EF2->>EF2: Format (JSON/CEF/LEEF)
        EF2->>SIEM: POST event
        SIEM-->>EF2: Response
        EF2->>DB: Record metrics
    end
```

---

## 🗃️ Modelo de Dados

### Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ PROFILES : has
    USERS ||--o{ ANSWERS : submits
    USERS ||--o{ MATURITY_SNAPSHOTS : generates
    USERS ||--o{ AI_PROVIDERS : configures
    USERS ||--o{ SIEM_INTEGRATIONS : manages
    USERS ||--o{ CHANGE_LOGS : creates
    
    SECURITY_DOMAINS ||--o{ DOMAINS : contains
    SECURITY_DOMAINS ||--o{ DEFAULT_QUESTIONS : has
    SECURITY_DOMAINS ||--o{ DEFAULT_FRAMEWORKS : includes
    
    DOMAINS ||--o{ SUBCATEGORIES : groups
    SUBCATEGORIES ||--o{ DEFAULT_QUESTIONS : contains
    
    DEFAULT_FRAMEWORKS ||--o{ DEFAULT_QUESTIONS : maps
    
    ANSWERS {
        uuid id PK
        uuid user_id FK
        string question_id
        string security_domain_id
        string response
        string evidence_ok
        string notes
        string[] evidence_links
    }
    
    MATURITY_SNAPSHOTS {
        uuid id PK
        uuid user_id FK
        string security_domain_id
        date snapshot_date
        float overall_score
        float overall_coverage
        int maturity_level
        json domain_metrics
        json framework_metrics
    }
    
    SECURITY_DOMAINS {
        string domain_id PK
        string domain_name
        string short_name
        string icon
        string color
        int display_order
    }
    
    SIEM_INTEGRATIONS {
        uuid id PK
        uuid user_id FK
        string name
        string endpoint_url
        string format
        string auth_type
        boolean is_enabled
        int events_sent
        string health_status
    }
```

### Tabelas Principais

| Tabela | Propósito | RLS |
|--------|-----------|-----|
| `security_domains` | Domínios (AI, Cloud, DevSecOps) | Read: auth |
| `domains` | Categorias L1 da taxonomia | Read: auth |
| `subcategories` | Subcategorias L2 | Read: auth |
| `default_questions` | Questões padrão | Read: auth |
| `custom_questions` | Questões do usuário | CRUD: owner |
| `answers` | Respostas do assessment | CRUD: owner |
| `maturity_snapshots` | Histórico de maturidade | CRUD: owner |
| `ai_providers` | Configurações de IA | CRUD: owner |
| `siem_integrations` | Integrações SIEM | CRUD: owner |
| `change_logs` | Logs de auditoria | Insert: auth, Read: owner |

---

## 🧩 Componentes do Frontend

### Hierarquia de Componentes

```mermaid
graph TD
    App[App.tsx]
    
    App --> Layout
    Layout --> Sidebar[AppSidebar]
    Layout --> Header[Header]
    Layout --> Main[Main Content]
    
    Main --> Home
    Main --> Assessment
    Main --> Dashboard
    Main --> Settings
    Main --> Profile
    
    Dashboard --> DashboardExecutive
    Dashboard --> DashboardGRC
    Dashboard --> DashboardSpecialist
    
    subgraph "Dashboard Components"
        DashboardExecutive --> DashboardHeader
        DashboardExecutive --> DashboardFrameworkSelector
        DashboardExecutive --> DashboardKPIGrid
        DashboardExecutive --> DashboardChartsGrid
        DashboardExecutive --> PeriodComparisonCard
        DashboardExecutive --> DashboardRoadmap
    end
    
    subgraph "Shared Components"
        DomainSwitcher
        ThemeToggle
        LanguageSelector
        AIAssistantPanel
    end
```

### Hooks Principais

```mermaid
graph LR
    subgraph "Data Hooks"
        useDashboardMetrics
        useMaturitySnapshots
        useAIProviders
    end
    
    subgraph "Feature Hooks"
        useAIAssistant
        useSpeechRecognition
        useSpeechSynthesis
        useVoiceCommands
        useVoiceProfile
    end
    
    subgraph "Utility Hooks"
        useAuth
        useToast
        useMobile
        useSwipeGesture
    end
    
    useDashboardMetrics --> useMaturitySnapshots
    useAIAssistant --> useSpeechRecognition
    useAIAssistant --> useSpeechSynthesis
    useVoiceCommands --> useSpeechRecognition
    useVoiceProfile --> AudioFeatureExtractor
    useVoiceProfile --> SpeakerVerifier
```

### Voice Profile System

O sistema de perfil de voz permite cadastrar e verificar a identidade do usuário através de características vocais.

```mermaid
graph TD
    subgraph "Voice Enrollment Flow"
        Start[Iniciar Cadastro] --> Record[Gravar Frase]
        Record --> Analyze[Analisar Áudio]
        Analyze --> Extract[Extrair Features]
        Extract --> Quality{Qualidade OK?}
        Quality --> |Sim| Next[Próxima Frase]
        Quality --> |Não| Retry[Regravar]
        Retry --> Record
        Next --> |Mais frases| Record
        Next --> |Completo| Save[Salvar Perfil]
    end
    
    subgraph "Audio Processing"
        Blob[Audio Blob] --> Decoder[AudioContext.decodeAudioData]
        Decoder --> Worker[Web Worker]
        Worker --> MFCC[Calcular MFCC]
        Worker --> Pitch[Detectar Pitch]
        Worker --> Energy[Calcular RMS Energy]
        Worker --> ZCR[Zero Crossing Rate]
        MFCC --> Features[VoiceFeatures]
        Pitch --> Features
        Energy --> Features
        ZCR --> Features
    end
```

#### Componentes do Sistema de Voz

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `useVoiceProfile` | `src/hooks/useVoiceProfile.ts` | Hook principal para enrollment e verificação |
| `AudioFeatureExtractor` | `src/lib/voiceProfile/audioFeatureExtractor.ts` | Extração de features com Web Worker |
| `SpeakerVerifier` | `src/lib/voiceProfile/speakerVerifier.ts` | Verificação de identidade vocal |
| `VoiceProfileCard` | `src/components/settings/VoiceProfileCard.tsx` | UI de cadastro e gerenciamento |

#### Features Extraídas

| Feature | Descrição | Uso |
|---------|-----------|-----|
| MFCC (13 coeficientes) | Mel-Frequency Cepstral Coefficients | Timbre vocal |
| Pitch Mean/Std | Frequência fundamental média e variação | Tom de voz |
| RMS Energy | Energia média do sinal | Volume/intensidade |
| Zero Crossing Rate | Taxa de cruzamento por zero | Características espectrais |
| Spectral Centroid | Centro de massa espectral | Brilho do som |
| Speaking Rate | Taxa de fala estimada | Ritmo da fala |

#### Web Worker para Processamento

O processamento de áudio é feito em um Web Worker para não bloquear a UI:

```typescript
// Worker inline criado via Blob
const workerCode = `
  function extractFeatures(samples, sampleRate) {
    return {
      mfcc: calculateSimplifiedMFCC(samples),
      spectralCentroid: estimateSpectralCentroid(samples, sampleRate),
      // ... outras features
    };
  }
  
  self.onmessage = function(event) {
    const { type, id, data } = event.data;
    const features = extractFeatures(data.samples, data.sampleRate);
    self.postMessage({ type: 'result', id, data: features });
  };
`;
```

#### Visualização de Áudio em Tempo Real

Durante a gravação, o hook expõe `audioLevels` (array de 12 valores 0-1) que representam os níveis de frequência em tempo real:

```typescript
// No hook useVoiceProfile
const startAudioAnalysis = (stream: MediaStream) => {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 64;
  
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);
  
  const updateLevels = () => {
    analyser.getByteFrequencyData(dataArray);
    // Mapear para 12 barras
    setAudioLevels(levels);
    requestAnimationFrame(updateLevels);
  };
};
```

### State Management

```mermaid
graph TB
    subgraph "Zustand Stores"
        SecurityDomainStore[securityDomainStore]
        FrameworkStore[frameworkStore]
    end
    
    subgraph "React Query"
        QAnswers[answers cache]
        QSnapshots[snapshots cache]
        QProviders[providers cache]
    end
    
    subgraph "Local State"
        UIState[Component state]
        FormState[Form state]
    end
    
    SecurityDomainStore --> useDashboardMetrics
    FrameworkStore --> useDashboardMetrics
    
    useDashboardMetrics --> QAnswers
    useMaturitySnapshots --> QSnapshots
    useAIProviders --> QProviders
```

---

## ⚡ Edge Functions

### Arquitetura das Functions

```mermaid
graph TB
    subgraph "Edge Runtime (Deno)"
        EF1[ai-assistant]
        EF2[audit-log]
        EF3[siem-forward]
        EF4[init-demo-user]
        EF5[init-demo-data]
    end
    
    subgraph "Shared"
        CORS[CORS Headers]
        Auth[JWT Validation]
        Supabase[Supabase Client]
    end
    
    EF1 --> CORS
    EF1 --> Auth
    EF1 --> Supabase
    
    EF2 --> CORS
    EF2 --> Auth
    EF2 --> Supabase
    
    EF3 --> CORS
    EF3 --> Supabase
    
    EF4 --> CORS
    EF4 --> Supabase
    
    EF5 --> CORS
    EF5 --> Supabase
```

### AI Assistant - Provider Router

```mermaid
graph TD
    Request[Incoming Request]
    
    Request --> GetProvider{Get Provider Config}
    GetProvider --> |User has default| UserProvider[User's Provider]
    GetProvider --> |No config| DefaultProvider[Lovable AI]
    
    UserProvider --> Router{Provider Type}
    DefaultProvider --> Router
    
    Router --> |lovable| Lovable[callLovableAI]
    Router --> |openai| OpenAI[callOpenAI]
    Router --> |anthropic| Anthropic[callAnthropic]
    Router --> |google| Google[callGoogle]
    Router --> |ollama| Ollama[callOllama]
    Router --> |huggingface| HuggingFace[callHuggingFace]
    Router --> |custom| Custom[callCustomEndpoint]
    
    Lovable --> Stream[SSE Stream]
    OpenAI --> Stream
    Anthropic --> Transform[Transform to OpenAI format]
    Google --> Transform
    Ollama --> Transform
    HuggingFace --> Stream
    Custom --> Stream
    Transform --> Stream
    
    Stream --> Response[Streaming Response]
```

---

## 🔒 Segurança

### Modelo de Segurança

```mermaid
graph TB
    subgraph "Authentication Layer"
        JWT[JWT Tokens]
        Session[Session Management]
        RateLimit[Rate Limiting]
    end
    
    subgraph "Authorization Layer"
        RLS[Row Level Security]
        Policies[RLS Policies]
        Triggers[Security Triggers]
    end
    
    subgraph "Data Protection"
        Encryption[API Key Encryption]
        Validation[Input Validation]
        Sanitization[Output Sanitization]
    end
    
    subgraph "Audit & Compliance"
        Logging[Audit Logging]
        GeoIP[Geolocation]
        SIEM[SIEM Integration]
    end
    
    JWT --> RLS
    RLS --> Policies
    Policies --> Triggers
    
    Validation --> Encryption
    
    Logging --> GeoIP
    Logging --> SIEM
```

### RLS Policy Pattern

```sql
-- Padrão: Usuário só acessa seus próprios dados
CREATE POLICY "Users can CRUD own data"
ON public.answers
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Padrão: Dados de referência são read-only
CREATE POLICY "Reference data is read-only"
ON public.default_questions
FOR SELECT
USING (auth.uid() IS NOT NULL);
```

### Trigger de Segurança

```sql
-- Auto-populate user_id on insert
CREATE TRIGGER set_user_id
BEFORE INSERT ON public.answers
FOR EACH ROW
EXECUTE FUNCTION public.set_current_user_id();
```

---

## 🔗 Integrações

### Diagrama de Integrações

```mermaid
graph LR
    subgraph "TrustLayer"
        App[Application]
        EF[Edge Functions]
    end
    
    subgraph "AI Providers"
        Lovable[Lovable AI Gateway]
        OpenAI[OpenAI API]
        Anthropic[Anthropic API]
        Google[Google AI]
        Ollama[Ollama Local]
        HF[Hugging Face]
    end
    
    subgraph "SIEM Systems"
        Splunk[Splunk]
        ArcSight[ArcSight]
        QRadar[IBM QRadar]
        Elastic[Elastic SIEM]
    end
    
    subgraph "External Services"
        GeoIP[ip-api.com]
        Supabase[Supabase Cloud]
    end
    
    App --> EF
    EF --> Lovable
    EF --> OpenAI
    EF --> Anthropic
    EF --> Google
    EF --> Ollama
    EF --> HF
    
    EF --> Splunk
    EF --> ArcSight
    EF --> QRadar
    EF --> Elastic
    
    EF --> GeoIP
    App --> Supabase
```

### Formatos de Integração SIEM

| Formato | Destinos Compatíveis |
|---------|---------------------|
| JSON | Splunk, Elastic, Custom |
| CEF | ArcSight, Splunk, McAfee |
| LEEF | IBM QRadar |
| Syslog | Qualquer SIEM |

---

## 📊 Métricas e Monitoramento

### Dashboard Metrics Pipeline

```mermaid
graph LR
    subgraph "Data Sources"
        Answers[answers]
        Questions[questions]
        Frameworks[frameworks]
    end
    
    subgraph "Processing"
        Filter[Filter by Domain]
        Calculate[Calculate Scores]
        Aggregate[Aggregate Metrics]
    end
    
    subgraph "Output"
        KPIs[KPI Cards]
        Charts[Charts]
        Roadmap[Roadmap]
        Gaps[Critical Gaps]
    end
    
    Answers --> Filter
    Questions --> Filter
    Frameworks --> Filter
    
    Filter --> Calculate
    Calculate --> Aggregate
    
    Aggregate --> KPIs
    Aggregate --> Charts
    Aggregate --> Roadmap
    Aggregate --> Gaps
```

### Cálculo de Maturidade

```typescript
// Scoring weights
const RESPONSE_WEIGHTS = {
  'Sim': 1.0,      // Full compliance
  'Parcial': 0.5,  // Partial compliance
  'Não': 0.0,      // Non-compliance
  'NA': null,      // Not applicable (excluded)
};

// Maturity levels
const MATURITY_LEVELS = [
  { level: 1, name: 'Inicial', minScore: 0 },
  { level: 2, name: 'Básico', minScore: 35 },
  { level: 3, name: 'Intermediário', minScore: 50 },
  { level: 4, name: 'Avançado', minScore: 65 },
  { level: 5, name: 'Otimizado', minScore: 80 },
];
```

---

## 🚀 Deploy e Infraestrutura

### Ambiente de Deploy

```mermaid
graph TB
    subgraph "Development"
        Local[localhost:5173]
        DevDB[Dev Database]
    end
    
    subgraph "Preview"
        Preview[preview.lovable.app]
        PreviewDB[Preview Database]
    end
    
    subgraph "Production"
        Prod[ai-assess-insight.lovable.app]
        ProdDB[Production Database]
        CDN[CDN Edge]
    end
    
    Local --> DevDB
    Preview --> PreviewDB
    Prod --> CDN
    CDN --> ProdDB
```

### CI/CD Pipeline

```mermaid
graph LR
    Code[Code Push]
    Build[Vite Build]
    Test[Run Tests]
    Deploy[Deploy Preview]
    Publish[Publish Production]
    
    Code --> Build
    Build --> Test
    Test --> Deploy
    Deploy --> |Manual| Publish
```

---

## 📚 Referências Técnicas

- [React 18 Documentation](https://react.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Zustand](https://docs.pmnd.rs/zustand)
- [TanStack Query](https://tanstack.com/query/latest)
- [Recharts](https://recharts.org/en-US/)
- [i18next](https://www.i18next.com/)
