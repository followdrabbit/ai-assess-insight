# 📡 TrustLayer API Documentation

Documentação completa das Edge Functions disponíveis na plataforma TrustLayer.

---

## 📋 Índice

- [Autenticação](#autenticação)
- [AI Assistant](#ai-assistant)
- [Audit Log](#audit-log)
- [SIEM Forward](#siem-forward)
- [Init Demo User](#init-demo-user)
- [Init Demo Data](#init-demo-data)
- [Códigos de Erro](#códigos-de-erro)

---

## 🔐 Autenticação

Todas as APIs (exceto `init-demo-user` e `init-demo-data`) requerem autenticação via JWT Bearer Token.

```http
Authorization: Bearer <seu_jwt_token>
```

O token é obtido após login via Supabase Auth.

---

## 🤖 AI Assistant

Assistente de IA para análise de segurança com suporte a múltiplos provedores.

### Endpoint

```
POST /functions/v1/ai-assistant
```

### Headers

| Header | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `Authorization` | string | Sim | Bearer token JWT |
| `Content-Type` | string | Sim | `application/json` |

### Request Body

```typescript
interface AIAssistantRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  context?: {
    overallScore?: number;
    maturityLevel?: number;
    coverage?: number;
    evidenceReadiness?: number;
    criticalGaps?: number;
    securityDomain?: string;
    frameworks?: string[];
    domainMetrics?: Array<{
      domainName: string;
      score: number;
      criticalGaps: number;
    }>;
    topGaps?: Array<{
      question: string;
      domain: string;
    }>;
  };
  provider?: {
    providerType: 'lovable' | 'openai' | 'anthropic' | 'google' | 'ollama' | 'huggingface' | 'custom';
    modelId?: string;
    maxTokens?: number;
    temperature?: number;
  };
}
```

### Exemplo de Request

```bash
curl -X POST "https://rgegwkfvxwqmeooqluyi.supabase.co/functions/v1/ai-assistant" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Quais são os principais gaps de segurança?"}
    ],
    "context": {
      "overallScore": 72.5,
      "maturityLevel": 3,
      "criticalGaps": 12,
      "securityDomain": "AI_SECURITY",
      "frameworks": ["NIST_AI_RMF", "ISO_27001_27002"]
    }
  }'
```

### Response (Streaming SSE)

A resposta é um stream de Server-Sent Events no formato OpenAI:

```
data: {"choices":[{"delta":{"content":"Os principais"},"index":0}]}

data: {"choices":[{"delta":{"content":" gaps identificados"},"index":0}]}

data: [DONE]
```

### Provedores Suportados

| Provedor | Tipo | Modelos Padrão |
|----------|------|----------------|
| Lovable AI | `lovable` | `google/gemini-3-flash-preview` |
| OpenAI | `openai` | `gpt-4o`, `gpt-4o-mini` |
| Anthropic | `anthropic` | `claude-3-5-sonnet-20241022` |
| Google | `google` | `gemini-1.5-flash`, `gemini-1.5-pro` |
| Ollama | `ollama` | `llama3.2`, `mistral` |
| Hugging Face | `huggingface` | `meta-llama/Meta-Llama-3.1-70B-Instruct` |

---

## 📝 Audit Log

Registra eventos de auditoria com metadados detalhados incluindo geolocalização.

### Endpoint

```
POST /functions/v1/audit-log
```

### Headers

| Header | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `Authorization` | string | Sim | Bearer token JWT |
| `Content-Type` | string | Sim | `application/json` |
| `x-session-id` | string | Não | ID da sessão do usuário |

### Request Body

```typescript
interface AuditLogRequest {
  entityType: 'framework' | 'question' | 'setting' | 'answer';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'disable' | 'enable';
  changes: Record<string, unknown>;
  sessionId?: string;
}
```

### Exemplo de Request

```bash
curl -X POST "https://rgegwkfvxwqmeooqluyi.supabase.co/functions/v1/audit-log" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "x-session-id: sess_abc123" \
  -d '{
    "entityType": "question",
    "entityId": "GOVERN-01-Q01",
    "action": "update",
    "changes": {
      "before": {"response": "Não"},
      "after": {"response": "Sim"}
    }
  }'
```

### Response

```json
{
  "success": true,
  "id": 12345,
  "requestId": "req_uuid_here",
  "geo": {
    "country": "Brazil",
    "countryCode": "BR",
    "city": "São Paulo",
    "region": "São Paulo",
    "timezone": "America/Sao_Paulo",
    "isp": "Vivo"
  }
}
```

### Campos Capturados Automaticamente

| Campo | Descrição |
|-------|-----------|
| `ip_address` | IP do cliente (via headers x-forwarded-for, x-real-ip, etc.) |
| `user_agent` | User-Agent completo do navegador |
| `device_type` | `desktop`, `mobile`, ou `tablet` |
| `browser_name` | Chrome, Firefox, Safari, Edge, Opera |
| `os_name` | Windows, macOS, Linux, Android, iOS |
| `geo_country` | País (via ip-api.com) |
| `geo_city` | Cidade (via ip-api.com) |

---

## 🔗 SIEM Forward

Encaminha eventos de auditoria para integrações SIEM configuradas.

### Endpoint

```
POST /functions/v1/siem-forward
```

### Headers

| Header | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `Authorization` | string | Sim | Bearer token JWT |
| `Content-Type` | string | Sim | `application/json` |

### Request Body

```typescript
interface SIEMForwardRequest {
  event: {
    id: number;
    entityType: string;
    entityId: string;
    action: string;
    changes: Record<string, unknown>;
    userId: string | null;
    ipAddress: string | null;
    geoCountry: string | null;
    geoCity: string | null;
    deviceType: string | null;
    browserName: string | null;
    osName: string | null;
    createdAt: string;
  };
  userId: string;
}
```

### Exemplo de Request

```bash
curl -X POST "https://rgegwkfvxwqmeooqluyi.supabase.co/functions/v1/siem-forward" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "id": 12345,
      "entityType": "answer",
      "entityId": "GOVERN-01-Q01",
      "action": "update",
      "changes": {"response": "Sim"},
      "userId": "user-uuid",
      "ipAddress": "200.100.50.25",
      "geoCountry": "Brazil",
      "geoCity": "São Paulo",
      "deviceType": "desktop",
      "browserName": "Chrome",
      "osName": "Windows",
      "createdAt": "2025-01-16T10:30:00Z"
    },
    "userId": "user-uuid"
  }'
```

### Response

```json
{
  "message": "Forwarded to 2/3 integrations",
  "results": [
    {
      "integrationId": "int_001",
      "success": true,
      "latencyMs": 145
    },
    {
      "integrationId": "int_002",
      "success": true,
      "latencyMs": 89
    },
    {
      "integrationId": "int_003",
      "success": false,
      "latencyMs": 5023,
      "error": "Connection timeout"
    }
  ]
}
```

### Formatos de Saída Suportados

#### JSON

```json
{
  "timestamp": "2025-01-16T10:30:00Z",
  "eventId": 12345,
  "severity": 3,
  "category": "audit",
  "action": "update",
  "entityType": "answer",
  "entityId": "GOVERN-01-Q01",
  "changes": {"response": "Sim"},
  "userId": "user-uuid",
  "sourceIp": "200.100.50.25",
  "geo": {
    "country": "Brazil",
    "city": "São Paulo"
  },
  "device": {
    "type": "desktop",
    "browser": "Chrome",
    "os": "Windows"
  }
}
```

#### CEF (Common Event Format)

```
CEF:0|SecurityAssessment|AuditLog|1.0|update|answer update|3|rt=1705401000000 cs1=GOVERN-01-Q01 cs1Label=EntityID suser=user-uuid src=200.100.50.25 cs2=Brazil cs2Label=Country cs3=São Paulo cs3Label=City
```

#### LEEF (Log Event Extended Format)

```
LEEF:2.0|SecurityAssessment|AuditLog|1.0|12345|devTime=2025-01-16T10:30:00Z	cat=answer	sev=3	action=update	resource=GOVERN-01-Q01	usrName=user-uuid	src=200.100.50.25	country=Brazil	city=São Paulo
```

#### Syslog (RFC 5424)

```
<110>1 2025-01-16T10:30:00Z security-assessment audit-log - 12345 [audit@12345 entityType="answer" action="update" entityId="GOVERN-01-Q01" userId="user-uuid" srcIp="200.100.50.25" country="Brazil" city="São Paulo"] answer update: GOVERN-01-Q01
```

### Níveis de Severidade

| Ação | Severidade | Descrição |
|------|------------|-----------|
| `delete` | 7 | Crítico |
| `disable` | 5 | Alerta |
| `create` | 3 | Informativo |
| `update` | 3 | Informativo |
| `enable` | 3 | Informativo |

---

## 👤 Init Demo User

Cria um usuário de demonstração para testes.

### Endpoint

```
POST /functions/v1/init-demo-user
```

### Headers

| Header | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `Content-Type` | string | Sim | `application/json` |

### Request Body

Nenhum corpo é necessário.

### Exemplo de Request

```bash
curl -X POST "https://rgegwkfvxwqmeooqluyi.supabase.co/functions/v1/init-demo-user" \
  -H "Content-Type: application/json"
```

### Response (Usuário Criado)

```json
{
  "success": true,
  "message": "Demo user created successfully",
  "email": "demo@aiassess.app",
  "created": true,
  "userId": "uuid-do-usuario"
}
```

### Response (Usuário Já Existe)

```json
{
  "success": true,
  "message": "Demo user already exists",
  "email": "demo@aiassess.app",
  "created": false
}
```

### Credenciais do Usuário Demo

| Campo | Valor |
|-------|-------|
| Email | `demo@aiassess.app` |
| Senha | `Demo@2025!` |

---

## 📊 Init Demo Data

Popula dados de demonstração para o usuário demo.

### Endpoint

```
POST /functions/v1/init-demo-data
```

### Headers

| Header | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `Content-Type` | string | Sim | `application/json` |

### Request Body

Nenhum corpo é necessário.

### Exemplo de Request

```bash
curl -X POST "https://rgegwkfvxwqmeooqluyi.supabase.co/functions/v1/init-demo-data" \
  -H "Content-Type: application/json"
```

### Response

```json
{
  "success": true,
  "message": "Demo data initialized",
  "answersCount": 223,
  "created": true,
  "snapshotsCreated": 93,
  "annotationsCreated": 18,
  "summary": {
    "AI_SECURITY": {
      "questionsAnswered": 143,
      "domainName": "AI Security"
    },
    "CLOUD_SECURITY": {
      "questionsAnswered": 36,
      "domainName": "Cloud Security"
    },
    "DEVSECOPS": {
      "questionsAnswered": 44,
      "domainName": "DevSecOps"
    }
  }
}
```

### Dados Gerados

| Tipo | Quantidade | Descrição |
|------|------------|-----------|
| Respostas | ~223 | Distribuição: 40% Sim, 30% Parcial, 20% Não, 10% NA |
| Snapshots | ~93 | Histórico de 90 dias (a cada 3 dias) para 3 domínios |
| Anotações | ~18 | Milestones em gráficos (6 por domínio) |

---

## ❌ Códigos de Erro

### Códigos HTTP

| Código | Descrição |
|--------|-----------|
| `200` | Sucesso |
| `201` | Criado com sucesso |
| `400` | Requisição inválida (campos faltando) |
| `401` | Não autorizado (token inválido/expirado) |
| `404` | Recurso não encontrado |
| `500` | Erro interno do servidor |

### Formato de Erro

```json
{
  "error": "Descrição do erro",
  "details": "Detalhes adicionais (opcional)"
}
```

### Exemplos de Erro

**401 - Token Inválido**
```json
{
  "error": "Invalid or expired token"
}
```

**400 - Campos Faltando**
```json
{
  "error": "Missing required fields: entityType, entityId, action"
}
```

**404 - Usuário Demo Não Encontrado**
```json
{
  "success": false,
  "error": "Demo user not found. Please run init-demo-user first."
}
```

---

## 🔧 Exemplos de Integração

### JavaScript/TypeScript

```typescript
import { supabase } from '@/integrations/supabase/client';

// Chamar AI Assistant
const response = await supabase.functions.invoke('ai-assistant', {
  body: {
    messages: [{ role: 'user', content: 'Análise de gaps' }],
    context: { overallScore: 75, criticalGaps: 8 }
  }
});

// Registrar Audit Log
const audit = await supabase.functions.invoke('audit-log', {
  body: {
    entityType: 'question',
    entityId: 'Q001',
    action: 'update',
    changes: { before: 'Não', after: 'Sim' }
  }
});
```

### Python

```python
import requests

headers = {
    'Authorization': f'Bearer {jwt_token}',
    'Content-Type': 'application/json'
}

# Chamar Audit Log
response = requests.post(
    'https://rgegwkfvxwqmeooqluyi.supabase.co/functions/v1/audit-log',
    headers=headers,
    json={
        'entityType': 'answer',
        'entityId': 'GOVERN-01-Q01',
        'action': 'update',
        'changes': {'response': 'Sim'}
    }
)

print(response.json())
```

---

## 🎤 Voice Recognition & Speech Synthesis

A plataforma TrustLayer oferece recursos avançados de reconhecimento de voz e síntese de fala para interação hands-free com o Assistente de IA.

### Reconhecimento de Voz (Speech-to-Text)

O sistema utiliza a Web Speech API para transcrição em tempo real.

#### Funcionalidades

| Recurso | Descrição |
|---------|-----------|
| **Transcrição em Tempo Real** | Exibe texto enquanto você fala |
| **Indicador de Confiança** | Mostra a precisão da transcrição (0-100%) |
| **Auto-restart** | Reinicia automaticamente após pausas |
| **Detecção de Silêncio** | Pausa após 3 segundos sem fala |
| **Histórico de Segmentos** | Mantém registro de todas as transcrições |
| **Multi-idioma** | Suporte a PT-BR, EN-US, ES-ES |

#### Interface TypeScript

```typescript
interface UseSpeechRecognitionReturn {
  isListening: boolean;           // Se está ouvindo
  transcript: string;             // Texto completo transcrito
  interimTranscript: string;      // Texto sendo processado
  finalTranscript: string;        // Texto já confirmado
  confidence: number;             // Nível de confiança (0-1)
  isSupported: boolean;           // Se o navegador suporta
  error: SpeechRecognitionError | null;
  transcriptHistory: TranscriptSegment[];
  startListening: (options?: SpeechRecognitionOptions) => void;
  stopListening: () => void;
  resetTranscript: () => void;
  clearError: () => void;
}

interface SpeechRecognitionOptions {
  language?: string;        // Idioma (default: navigator.language)
  continuous?: boolean;     // Modo contínuo (default: true)
  interimResults?: boolean; // Resultados intermediários (default: true)
  maxAlternatives?: number; // Alternativas de transcrição (default: 3)
  autoRestart?: boolean;    // Reinício automático (default: true)
  silenceTimeout?: number;  // Timeout de silêncio em ms (default: 3000)
}
```

#### Exemplo de Uso

```typescript
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

function VoiceInput() {
  const { 
    isListening, 
    transcript, 
    confidence,
    startListening, 
    stopListening 
  } = useSpeechRecognition();

  return (
    <div>
      <button onClick={() => startListening({ language: 'pt-BR' })}>
        {isListening ? 'Parar' : 'Falar'}
      </button>
      <p>{transcript}</p>
      <p>Confiança: {Math.round(confidence * 100)}%</p>
    </div>
  );
}
```

#### Tratamento de Erros

| Tipo de Erro | Descrição | Solução |
|--------------|-----------|---------|
| `no-speech` | Nenhuma fala detectada | Fale mais alto ou próximo ao microfone |
| `audio-capture` | Falha na captura de áudio | Verifique o microfone |
| `not-allowed` | Permissão negada | Habilite nas configurações do navegador |
| `network` | Erro de rede | Verifique a conexão |
| `aborted` | Cancelado pelo usuário | N/A |

---

### Síntese de Fala (Text-to-Speech)

O sistema converte texto em áudio usando vozes nativas do sistema.

#### Funcionalidades

| Recurso | Descrição |
|---------|-----------|
| **Fila de Prioridade** | Mensagens urgentes podem furar a fila |
| **Controles de Reprodução** | Play, Pause, Stop, Skip |
| **Progresso Visual** | Barra de progresso estimada |
| **Pré-processamento** | Remove markdown, adiciona pausas naturais |
| **Seleção de Voz** | Escolha entre vozes disponíveis no sistema |
| **Ajustes de Velocidade** | Taxa de 0.5x a 2x |

#### Interface TypeScript

```typescript
interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;        // Se está falando
  isPaused: boolean;          // Se está pausado
  isSupported: boolean;       // Se o navegador suporta
  error: SpeechSynthesisError | null;
  currentText: string;        // Texto sendo falado
  progress: number;           // Progresso (0-100)
  speak: (text: string, options?: SpeakOptions) => string;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice) => void;
  rate: number;               // Velocidade (0.1 - 10)
  setRate: (rate: number) => void;
  pitch: number;              // Tom (0 - 2)
  setPitch: (pitch: number) => void;
  volume: number;             // Volume (0 - 1)
  setVolume: (volume: number) => void;
  queueLength: number;        // Itens na fila
  clearQueue: () => void;
  clearError: () => void;
}

interface SpeakOptions {
  priority?: number;          // Prioridade (maior = mais urgente)
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: SpeechSynthesisError) => void;
}
```

#### Exemplo de Uso

```typescript
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

function TextReader() {
  const { 
    isSpeaking, 
    isPaused,
    progress,
    speak, 
    pause,
    resume,
    stop,
    voices,
    selectedVoice,
    setSelectedVoice
  } = useSpeechSynthesis();

  return (
    <div>
      <select onChange={(e) => setSelectedVoice(voices[+e.target.value])}>
        {voices.map((v, i) => (
          <option key={i} value={i}>{v.name} ({v.lang})</option>
        ))}
      </select>
      
      <button onClick={() => speak('Olá, bem-vindo ao TrustLayer!')}>
        Falar
      </button>
      
      {isSpeaking && (
        <>
          <progress value={progress} max="100" />
          <button onClick={isPaused ? resume : pause}>
            {isPaused ? 'Continuar' : 'Pausar'}
          </button>
          <button onClick={stop}>Parar</button>
        </>
      )}
    </div>
  );
}
```

---

### Comandos de Voz

O Assistente de IA suporta comandos de voz para navegação e consulta de dados.

#### Comandos de Navegação

| Comando (PT) | Comando (EN) | Ação |
|--------------|--------------|------|
| "Ir para home" | "Go to home" | Navega para Home |
| "Abrir dashboard" | "Open dashboard" | Dashboard Executivo |
| "Dashboard GRC" | "GRC dashboard" | Dashboard GRC |
| "Dashboard especialista" | "Specialist dashboard" | Dashboard Técnico |
| "Ir para avaliação" | "Go to assessment" | Página de Avaliação |
| "Ir para configurações" | "Go to settings" | Página de Configurações |
| "Meu perfil" | "My profile" | Página de Perfil |

#### Comandos de Domínio

| Comando (PT) | Ação |
|--------------|------|
| "AI Security" / "Segurança de IA" | Muda para domínio AI Security |
| "Cloud Security" / "Segurança de nuvem" | Muda para domínio Cloud Security |
| "DevSecOps" | Muda para domínio DevSecOps |

#### Comandos de Dados

| Comando (PT) | Resposta |
|--------------|----------|
| "Mostrar gaps críticos" | Lista os top gaps identificados |
| "Resumo da postura" | Resumo geral de segurança |
| "Qual é meu score?" | Score atual e nível de maturidade |
| "Nível de maturidade" | Nível de maturidade detalhado |
| "Cobertura" | Progresso da avaliação |

#### Comandos de Exportação

| Comando (PT) | Ação |
|--------------|------|
| "Exportar HTML" | Gera relatório HTML |
| "Exportar Excel" | Gera planilha XLSX |

---

## 🎤 Voice Profile API

### Visão Geral

O sistema de perfil de voz permite cadastrar a identidade vocal do usuário para comandos de voz personalizados.

### Hook: useVoiceProfile

```typescript
import { useVoiceProfile } from '@/hooks/useVoiceProfile';

const {
  // State
  profile,           // VoiceProfile | null
  isLoading,         // boolean
  isEnrolling,       // boolean
  isRecording,       // boolean
  isProcessing,      // boolean
  recordingDuration, // number (segundos)
  audioLevels,       // number[] (12 valores 0-1 para visualização)
  currentPhraseIndex,// number
  enrollmentProgress,// number (0-1)
  enrolledSamples,   // EnrollmentSample[]
  error,             // string | null
  
  // Enrollment Actions
  startEnrollment,   // (level: 'standard' | 'advanced', language?: string) => void
  recordPhrase,      // () => Promise<EnrollmentSample | null>
  stopRecording,     // () => void
  skipPhrase,        // () => void
  retryPhrase,       // () => void
  completeEnrollment,// () => Promise<boolean>
  cancelEnrollment,  // () => void
  
  // Profile Actions
  deleteProfile,     // () => Promise<void>
  toggleProfileEnabled, // () => Promise<void>
  updateNoiseThreshold, // (threshold: number) => Promise<void>
  
  // Verification
  verifyVoice,       // (audioBlob: Blob) => Promise<VerificationResult | null>
} = useVoiceProfile();
```

### Tipos

```typescript
interface VoiceProfile {
  id: string;
  userId: string;
  profileName: string;
  enrollmentLevel: 'standard' | 'advanced';
  enrollmentPhrasesCount: number;
  voiceFeatures: VoiceFeatures | null;
  noiseThreshold: number;
  isEnabled: boolean;
  enrolledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface VoiceFeatures {
  mfcc: number[];           // 13 coeficientes MFCC
  spectralCentroid: number; // Centro espectral
  spectralRolloff: number;  // Rolloff espectral
  zeroCrossingRate: number; // Taxa de cruzamento por zero
  rmsEnergy: number;        // Energia RMS
  pitchMean: number;        // Pitch médio (Hz)
  pitchStd: number;         // Desvio padrão do pitch
  speakingRate: number;     // Taxa de fala (sílabas/s)
}

interface EnrollmentSample {
  phraseIndex: number;
  phraseText: string;
  audioFeatures: VoiceFeatures;
  durationMs: number;
  sampleRate: number;
  qualityScore: number;
}

interface VerificationResult {
  isMatch: boolean;
  confidence: number;
  scores: {
    mfcc: number;
    pitch: number;
    energy: number;
    speaking: number;
  };
}
```

### Níveis de Enrollment

| Nível | Frases | Duração | Precisão |
|-------|--------|---------|----------|
| `standard` | 6 | 1-2 min | Boa |
| `advanced` | 12 | 3-5 min | Excelente |

### Visualização de Áudio em Tempo Real

O hook expõe `audioLevels`, um array de 12 valores (0-1) que representam os níveis de frequência do microfone em tempo real durante a gravação:

```tsx
// Exemplo de uso no componente
{isRecording && (
  <div className="flex items-end justify-center gap-1 h-16">
    {audioLevels.map((level, i) => (
      <div
        key={i}
        className="w-2 bg-destructive rounded-full transition-all duration-75"
        style={{
          height: `${Math.max(8, level * 100)}%`,
          opacity: Math.max(0.4, level),
        }}
      />
    ))}
  </div>
)}
```

### Web Worker Processing

O processamento de áudio é feito em background usando Web Worker para não bloquear a UI:

```typescript
// AudioFeatureExtractor usa worker inline
const extractor = new AudioFeatureExtractor();
const features = await extractor.extractFeaturesFromBlob(audioBlob);
const quality = extractor.calculateQualityScore(features, durationMs);
```

---

## 📚 Referências

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [OpenAI API Format](https://platform.openai.com/docs/api-reference)
- [CEF Format Specification](https://community.microfocus.com/t5/ArcSight-Connectors/ArcSight-Common-Event-Format-CEF-Implementation-Standard/ta-p/1645557)
- [LEEF Format Specification](https://www.ibm.com/docs/en/dsm?topic=leef-overview)
- [Syslog RFC 5424](https://datatracker.ietf.org/doc/html/rfc5424)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
- [Web Audio API - AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
