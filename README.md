# 🛡️ TrustLayer - Security Governance Platform

Uma plataforma completa de governança de segurança multi-domínio para **AI Security**, **Cloud Security** e **DevSecOps**, baseada em frameworks reconhecidos internacionalmente como NIST AI RMF, ISO 27001/27002, LGPD, CSA CCM, OWASP e outros.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.3-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg)
![Vite](https://img.shields.io/badge/Vite-5.0-646cff.svg)
![Supabase](https://img.shields.io/badge/Supabase-Cloud-3ecf8e.svg)

## 📋 Sobre o Projeto

Esta ferramenta permite que organizações avaliem sua postura de segurança em múltiplos domínios, identificando gaps críticos, gerando roadmaps de remediação e acompanhando a evolução da maturidade ao longo do tempo.

### ✨ Principais Funcionalidades

#### 🎯 Avaliação Multi-Domínio
- **AI Security**: Avaliação baseada em NIST AI RMF, ISO 23894
- **Cloud Security**: Avaliação baseada em CSA CCM, ISO 27017
- **DevSecOps**: Avaliação baseada em NIST SSDF, OWASP

#### 📊 Dashboards Especializados
- **Executivo**: Visão estratégica para CISO e liderança com KPIs consolidados
- **GRC**: Governança, Riscos e Compliance com foco em cobertura de frameworks
- **Especialista**: Detalhes técnicos para arquitetos e engenheiros de segurança

#### 📈 Análise de Tendências
- **Histórico de Maturidade**: Snapshots automáticos diários para acompanhamento temporal
- **Comparação de Períodos**: Visualização side-by-side de diferentes intervalos de tempo
- **Anotações em Gráficos**: Marcação de eventos e milestones importantes
- **Indicadores por Domínio**: Métricas específicas (NIST Functions, CSA Domains, SDLC Phases)

#### 🤖 Assistente de IA
- **Chat Interativo**: Análise contextual do assessment com suporte a múltiplos provedores
- **Comandos de Voz**: Navegação e execução de ações por voz (Web Speech API)
- **Provedores Configuráveis**: OpenAI, Claude, Gemini, Ollama, Hugging Face

#### 🔗 Integrações
- **SIEM Integration**: Encaminhamento de eventos em JSON, CEF, LEEF, Syslog
- **Monitoramento de Saúde**: Métricas de latência, taxa de sucesso e status de conexão
- **Audit Logging**: Logs detalhados com IP, user-agent e geolocalização

#### 📋 Gestão de Conteúdo
- **Frameworks Customizáveis**: Adicionar, editar ou desabilitar frameworks
- **Questões Personalizadas**: Criar questões específicas da organização
- **Versionamento**: Histórico de alterações com diff e rollback
- **Import/Export**: Importação em massa via Excel e exportação de configurações

#### 🌐 Internacionalização
- Suporte completo a **Português (BR)**, **English (US)** e **Español (ES)**
- Sincronização de preferência de idioma no perfil do usuário

#### 📄 Exportação de Relatórios
- **HTML Standalone**: Relatórios fiéis ao estado atual do dashboard
- **Gráficos SVG**: Visualizações vetoriais de alta qualidade
- **Roadmap Estratégico**: Priorização em horizontes de 30/60/90 dias

## 🛠️ Stack Tecnológica

| Tecnologia | Uso |
|------------|-----|
| [React 18](https://react.dev/) | Framework UI |
| [TypeScript](https://www.typescriptlang.org/) | Tipagem estática |
| [Vite](https://vitejs.dev/) | Build tool e dev server |
| [Tailwind CSS](https://tailwindcss.com/) | Estilização |
| [shadcn/ui](https://ui.shadcn.com/) | Componentes UI |
| [Zustand](https://zustand-demo.pmnd.rs/) | Gerenciamento de estado |
| [Recharts](https://recharts.org/) | Visualização de dados |
| [Supabase](https://supabase.com/) | Backend (banco de dados, auth, edge functions) |
| [TanStack Query](https://tanstack.com/query) | Gerenciamento de dados assíncronos |
| [React Router](https://reactrouter.com/) | Roteamento |
| [i18next](https://www.i18next.com/) | Internacionalização |
| [ExcelJS](https://github.com/exceljs/exceljs) | Importação/Exportação Excel |

## 📦 Pré-requisitos

- **Node.js** 18.x ou superior
- **npm** 9.x ou superior (ou yarn/pnpm)

## 🚀 Instalação e Execução Local

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/trustlayer.git
cd trustlayer
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Execute o servidor de desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

> **Nota**: O projeto utiliza Lovable Cloud para backend, que é configurado automaticamente.

## 📜 Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera build de produção |
| `npm run preview` | Visualiza o build de produção localmente |
| `npm run lint` | Executa o linter (ESLint) |
| `npm run test` | Executa os testes |

## 📁 Estrutura do Projeto

```
src/
├── components/           # Componentes React reutilizáveis
│   ├── ui/              # Componentes shadcn/ui
│   ├── dashboard/       # Componentes de dashboard
│   ├── settings/        # Componentes de configuração
│   ├── ai-assistant/    # Componentes do assistente IA
│   └── auth/            # Componentes de autenticação
├── data/                # Dados estáticos (frameworks, questões, taxonomia)
├── hooks/               # Custom React hooks
├── i18n/                # Arquivos de internacionalização
│   └── locales/         # Traduções (pt-BR, en-US, es-ES)
├── integrations/        # Integrações externas (Supabase)
├── lib/                 # Utilitários e lógica de negócio
│   ├── database.ts      # Operações de banco de dados
│   ├── scoring.ts       # Cálculos de maturidade e métricas
│   ├── frameworks.ts    # Gerenciamento de frameworks
│   ├── securityDomains.ts # Gerenciamento de domínios
│   ├── siemIntegration.ts # Integração SIEM
│   ├── auditLog.ts      # Sistema de auditoria
│   └── stores.ts        # Stores Zustand
├── pages/               # Páginas da aplicação
│   ├── Home.tsx         # Página inicial com onboarding
│   ├── Assessment.tsx   # Questionário de avaliação
│   ├── Dashboard*.tsx   # Dashboards (Executive, GRC, Specialist)
│   ├── Profile.tsx      # Perfil do usuário
│   └── Settings.tsx     # Configurações
└── test/                # Testes

supabase/
├── functions/           # Edge Functions
│   ├── ai-assistant/    # Assistente de IA
│   ├── audit-log/       # Registro de auditoria
│   ├── siem-forward/    # Encaminhamento SIEM
│   ├── init-demo-data/  # Dados de demonstração
│   └── init-demo-user/  # Usuário de demonstração
└── config.toml          # Configuração Supabase
```

## 🗄️ Banco de Dados

### Principais Tabelas

| Tabela | Descrição |
|--------|-----------|
| `security_domains` | Domínios de segurança (AI, Cloud, DevSecOps) |
| `domains` | Categorias L1 da taxonomia |
| `subcategories` | Subcategorias L2 da taxonomia |
| `default_questions` | Questões padrão do sistema |
| `custom_questions` | Questões personalizadas do usuário |
| `answers` | Respostas do assessment |
| `default_frameworks` | Frameworks padrão |
| `custom_frameworks` | Frameworks personalizados |
| `assessment_meta` | Metadados (frameworks habilitados/selecionados) |
| `maturity_snapshots` | Histórico de maturidade |
| `chart_annotations` | Anotações em gráficos |
| `ai_providers` | Configurações de provedores IA |
| `siem_integrations` | Integrações SIEM |
| `siem_metrics` | Métricas de saúde SIEM |
| `change_logs` | Logs de auditoria |
| `question_versions` | Versionamento de questões |
| `profiles` | Perfis de usuário |

## 🎯 Fluxo de Uso

1. **Login**: Acesse com suas credenciais ou use a conta demo
2. **Selecione o Domínio**: Escolha entre AI Security, Cloud Security ou DevSecOps
3. **Configure Frameworks**: Habilite os frameworks relevantes para sua organização
4. **Avaliação**: Responda às questões (Sim/Parcial/Não/NA) com evidências
5. **Dashboards**: Analise métricas, gaps e roadmap por perfil (Executivo/GRC/Especialista)
6. **Compare Períodos**: Visualize evolução comparando diferentes intervalos de tempo
7. **Exporte**: Gere relatórios HTML para compartilhamento

## 🔒 Segurança

- **Row Level Security (RLS)**: Habilitado em todas as tabelas
- **Autenticação**: Email/senha com confirmação automática
- **Rate Limiting**: Proteção contra brute-force no login
- **Validação de Senha**: Requisitos de complexidade (8+ chars, maiúsculas, números, símbolos)
- **Auditoria**: Logs detalhados de todas as ações
- **Isolamento Multi-Tenant**: Dados segregados por usuário e domínio

## 🧪 Testes

```bash
# Executar todos os testes
npm run test

# Testes incluem:
# - Validação de chaves i18n
# - Consistência de placeholders
# - Snapshots de traduções
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

- Abra uma [issue](https://github.com/seu-usuario/trustlayer/issues) para reportar bugs
- Discussões e sugestões são bem-vindas nas [discussions](https://github.com/seu-usuario/trustlayer/discussions)

---

Desenvolvido com ❤️ para a comunidade de segurança
