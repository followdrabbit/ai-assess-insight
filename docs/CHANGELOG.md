# 📋 Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.2.0] - 2025-01-17

### Adicionado

#### 🎨 Sistema de Design
- Novo sistema de skeleton loading animado com efeitos shimmer e pulse
- Componentes `ShimmerSkeleton`, `PulseSkeleton`, `StatsCardSkeleton`, `TableSkeleton`, `ChartSkeleton`
- Skeletons específicos para `AuditLogsPanel`, `SIEMIntegrationsPanel`, `AIProvidersPanel`
- Animações de entrada em cascata (stagger) para cards em todas as abas de Settings
- Efeitos de hover com scale e glow em cards interativos

#### 🔧 Configurações
- Painel de Preferências centralizado na página de Settings
- Busca global de configurações com suporte i18n
- Filtros e ordenação para listas de gerenciamento

#### 📊 Analytics
- Comparação de períodos side-by-side nos dashboards
- Anotações em gráficos para marcar milestones
- Indicadores específicos por domínio (NIST Functions, CSA Domains, SDLC Phases)

#### 🔗 Integrações
- Painel de saúde SIEM com métricas de latência e taxa de sucesso
- Logs de auditoria com captura de IP, geolocalização e device info
- Múltiplos formatos de export SIEM (JSON, CEF, LEEF, Syslog)

### Modificado

- Skeletons de loading agora usam animações Framer Motion
- Cards de configurações com estados de loading animados
- Header de Settings alinhado a 56px para consistência com sidebar

### Corrigido

- Tooltip de charts funcionando fora de ChartContainer
- Z-index de dropdowns em modais
- Overflow de conteúdo em cards de dashboard

---

## [1.1.0] - 2025-01-16

### Adicionado

#### 🎤 Sistema de Voz
- **Voice Profile**: Cadastro biométrico de voz do usuário
  - Níveis de enrollment: Padrão (6 frases) e Avançado (12 frases)
  - Extração de features via Web Worker (MFCC, Pitch, Spectral, Energy)
  - Visualização de ondas sonoras em tempo real (12 barras de frequência)
  - Barra de progresso durante processamento de áudio
  - Sensibilidade ajustável de verificação
- **Speech-to-Text**: Suporte a Web Speech API, OpenAI Whisper e endpoints customizados
- **Text-to-Speech**: Fila de prioridade, controles de reprodução, pré-processamento de texto
- **Comandos de Voz**: Navegação, troca de domínios, consultas de dados, exportação

#### 🤖 Assistente de IA
- Suporte ao Lovable AI Gateway (sem necessidade de API key)
- Múltiplos provedores: OpenAI, Claude, Gemini, Ollama, Hugging Face
- Respostas streaming via SSE
- Contexto automático do assessment
- Indicador visual de verificação de voz

#### 📊 Dashboards Multi-Domínio
- **DomainSwitcher**: Alternância entre AI Security, Cloud Security, DevSecOps
- **Indicadores Específicos**: 
  - AI Security: NIST AI RMF Functions (Govern, Map, Measure, Manage)
  - Cloud Security: CSA CCM Control Domains
  - DevSecOps: NIST SSDF SDLC Phases
- **Period Comparison**: Comparação visual de dois períodos (30 dias vs. anteriores)

#### 📋 Gestão de Conteúdo
- Import/Export de questões via Excel
- Versionamento de questões com diff e rollback
- Frameworks customizáveis por domínio

### Modificado

- Migração de `xlsx` para `exceljs` (correção de vulnerabilidades de segurança)
- Dashboards agora são 100% domain-aware
- Sistema de navegação para gaps críticos com highlight visual

---

## [1.0.0] - 2025-01-15

### Adicionado

#### 🏗️ Arquitetura Base
- Plataforma React 18 + TypeScript + Vite
- Integração Supabase (Auth, PostgreSQL, Edge Functions)
- Design system com shadcn/ui + Tailwind CSS
- Internacionalização completa (PT-BR, EN-US, ES-ES)

#### 🔐 Autenticação
- Login/Signup com email/senha
- Auto-confirm de email habilitado
- Rate limiting no login com exponential backoff
- Password strength meter com requisitos visuais

#### 📊 Dashboards
- **Executivo**: KPIs estratégicos, roadmap 30/60/90 dias, top gaps
- **GRC**: Cobertura por framework, distribuição de respostas, métricas de evidência
- **Especialista**: Análise por categoria, ownership, gaps por domínio L2

#### 📝 Assessment
- Questionário estruturado por taxonomia L1/L2
- Respostas: Sim, Parcial, Não, NA
- Campos de evidência com links e notas
- Filtros por framework e criticidade

#### 🔒 Segurança
- Row Level Security em todas as tabelas
- Triggers de auto-populate para user_id
- Isolamento multi-tenant por usuário e domínio
- Audit logging básico

#### 📄 Exportação
- Relatórios HTML standalone com gráficos SVG
- Exportação Excel (ExcelJS)

### Estrutura de Dados

- **3 domínios**: AI Security, Cloud Security, DevSecOps
- **143 questões** de AI Security (NIST AI RMF, ISO 42001, etc.)
- **36 questões** de Cloud Security (CSA CCM, CIS Controls, etc.)
- **44 questões** de DevSecOps (NIST SSDF, OWASP SAMM, etc.)
- **20+ frameworks** mapeados

---

## Tipos de Mudanças

- **Adicionado** para novas funcionalidades
- **Modificado** para mudanças em funcionalidades existentes
- **Obsoleto** para funcionalidades que serão removidas em breve
- **Removido** para funcionalidades removidas
- **Corrigido** para correções de bugs
- **Segurança** para vulnerabilidades corrigidas
