# 🛡️ TrustLayer - Security Governance Platform

Uma plataforma completa de governança de segurança multi-domínio para AI Security, Cloud Security e DevSecOps, baseada em frameworks reconhecidos internacionalmente como NIST AI RMF, ISO 27001/27002, LGPD e outros.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.3-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg)
![Vite](https://img.shields.io/badge/Vite-5.0-646cff.svg)

## 📋 Sobre o Projeto

Esta ferramenta permite que organizações avaliem sua postura de segurança em relação a sistemas de IA, identificando gaps críticos, gerando roadmaps de remediação e acompanhando a evolução da maturidade ao longo do tempo.

### ✨ Principais Funcionalidades

- **Avaliação Estruturada**: Questionário baseado em taxonomia L1/L2 com mais de 70 questões
- **Multi-Framework**: Suporte a NIST AI RMF, ISO 27001/27002, ISO 23894, LGPD, NIST SSDF, CSA, OWASP
- **Dashboards Especializados**:
  - **Executivo**: Visão estratégica para CISO e liderança
  - **GRC**: Governança, Riscos e Compliance com foco em cobertura
  - **Especialista**: Detalhes técnicos para arquitetos e engenheiros
- **Roadmap Estratégico**: Priorização de gaps em horizontes de 30/60/90 dias
- **Exportação de Relatórios**: Relatórios HTML fidedignos ao estado atual do dashboard
- **Histórico de Maturidade**: Snapshots automáticos para acompanhamento temporal
- **Gestão de Frameworks**: Habilitar/desabilitar frameworks conforme necessidade
- **Questões Customizáveis**: Adicionar, editar ou desabilitar questões

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
| [Supabase](https://supabase.com/) | Backend (banco de dados e autenticação) |
| [TanStack Query](https://tanstack.com/query) | Gerenciamento de dados assíncronos |
| [React Router](https://reactrouter.com/) | Roteamento |

## 📦 Pré-requisitos

- **Node.js** 18.x ou superior
- **npm** 9.x ou superior (ou yarn/pnpm)
- **Supabase** (projeto configurado - opcional para desenvolvimento local)

## 🚀 Instalação e Execução Local

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/ai-security-assessment.git
cd ai-security-assessment
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_anonima
```

> **Nota**: Para desenvolvimento sem Supabase, a aplicação funcionará com dados locais padrão.

### 4. Execute o servidor de desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

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
├── components/          # Componentes React reutilizáveis
│   ├── ui/             # Componentes shadcn/ui
│   └── settings/       # Componentes de configuração
├── data/               # Dados estáticos (frameworks, questões, taxonomia)
├── hooks/              # Custom React hooks
├── integrations/       # Integrações externas (Supabase)
├── lib/                # Utilitários e lógica de negócio
│   ├── database.ts     # Operações de banco de dados
│   ├── scoring.ts      # Cálculos de maturidade e métricas
│   ├── frameworks.ts   # Gerenciamento de frameworks
│   └── stores.ts       # Stores Zustand
├── pages/              # Páginas da aplicação
│   ├── Home.tsx        # Página inicial com onboarding
│   ├── Assessment.tsx  # Questionário de avaliação
│   ├── Dashboard*.tsx  # Dashboards (Executive, GRC, Specialist)
│   └── Settings.tsx    # Configurações
└── test/               # Testes
```

## 🗄️ Banco de Dados (Supabase)

O projeto utiliza Supabase como backend. As principais tabelas são:

- `answers` - Respostas do questionário
- `custom_questions` - Questões personalizadas
- `custom_frameworks` - Frameworks personalizados
- `disabled_questions` - Questões desabilitadas
- `maturity_snapshots` - Histórico de maturidade
- `assessment_meta` - Metadados da avaliação (frameworks habilitados/selecionados)

### Migrações

As migrações SQL estão em `supabase/migrations/`. Para aplicar:

```bash
npx supabase db push
```

## 🎯 Fluxo de Uso

1. **Home**: Selecione os frameworks relevantes para sua organização
2. **Avaliação**: Responda às questões (Sim/Parcial/Não/NA)
3. **Dashboards**: Analise métricas, gaps e roadmap
4. **Exportar**: Gere relatórios HTML para compartilhamento

## 🔒 Segurança

- Row Level Security (RLS) habilitado em todas as tabelas
- Validação de entrada no cliente e servidor
- Sem armazenamento de credenciais sensíveis no código

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

- Abra uma [issue](https://github.com/seu-usuario/ai-security-assessment/issues) para reportar bugs
- Discussões e sugestões são bem-vindas nas [discussions](https://github.com/seu-usuario/ai-security-assessment/discussions)

---

Desenvolvido com ❤️ para a comunidade de segurança de IA
