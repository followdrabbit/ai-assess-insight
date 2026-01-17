# 🤝 Contribuindo com o TrustLayer

Obrigado pelo interesse em contribuir com o TrustLayer! Este documento fornece diretrizes para contribuições.

---

## 📋 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Contribuir](#como-contribuir)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Padrões de Código](#padrões-de-código)
- [Estrutura de Commits](#estrutura-de-commits)
- [Pull Requests](#pull-requests)
- [Reportando Bugs](#reportando-bugs)
- [Sugerindo Features](#sugerindo-features)

---

## 📜 Código de Conduta

Este projeto segue o [Contributor Covenant](https://www.contributor-covenant.org/). Ao participar, você concorda em manter um ambiente respeitoso e inclusivo.

---

## 🚀 Como Contribuir

### Tipos de Contribuição

1. **🐛 Correção de Bugs**: Identifique e corrija problemas
2. **✨ Novas Features**: Adicione funcionalidades
3. **📚 Documentação**: Melhore docs, exemplos, tutoriais
4. **🌍 Traduções**: Adicione ou melhore traduções (i18n)
5. **🧪 Testes**: Adicione ou melhore cobertura de testes
6. **🔒 Frameworks de Segurança**: Adicione novos frameworks (NIST, ISO, CSA, etc.)
7. **❓ Questões**: Adicione questões de avaliação

---

## 💻 Configuração do Ambiente

### Pré-requisitos

- Node.js 18.x ou superior
- npm 9.x ou superior
- Git

### Setup Local

```bash
# 1. Fork o repositório no GitHub

# 2. Clone seu fork
git clone https://github.com/SEU_USUARIO/trustlayer.git
cd trustlayer

# 3. Adicione o upstream
git remote add upstream https://github.com/ORIGINAL/trustlayer.git

# 4. Instale dependências
npm install

# 5. Inicie o servidor de desenvolvimento
npm run dev
```

### Variáveis de Ambiente

O projeto usa Lovable Cloud, que configura automaticamente as variáveis necessárias. Para desenvolvimento local com Supabase próprio:

```env
VITE_SUPABASE_URL=sua_url
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave
```

---

## 📝 Padrões de Código

### TypeScript

```typescript
// ✅ BOM: Tipos explícitos, nomes descritivos
interface DashboardMetrics {
  overallScore: number;
  maturityLevel: number;
  criticalGaps: number;
}

const calculateMetrics = (answers: Answer[]): DashboardMetrics => {
  // implementação
};

// ❌ EVITAR: any, nomes genéricos
const calc = (data: any) => {
  // ...
};
```

### React Components

```tsx
// ✅ BOM: Componente funcional, props tipadas
interface MetricCardProps {
  title: string;
  value: number;
  trend?: 'up' | 'down' | 'stable';
}

export const MetricCard = ({ title, value, trend }: MetricCardProps) => {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </Card>
  );
};

// ❌ EVITAR: Props não tipadas, class components
```

### Tailwind CSS

```tsx
// ✅ BOM: Tokens semânticos do design system
<div className="bg-background text-foreground border-border">
<Button variant="destructive" />

// ❌ EVITAR: Cores hardcoded
<div className="bg-white text-black border-gray-200">
<button className="bg-red-500">
```

### Internacionalização (i18n)

```tsx
// ✅ BOM: Usar hook useTranslation
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  return <h1>{t('dashboard.title')}</h1>;
};

// ❌ EVITAR: Strings hardcoded
return <h1>Dashboard</h1>;
```

### Adicionar Tradução

1. Adicione a chave em `src/i18n/locales/en-US.json`
2. Adicione traduções em `pt-BR.json` e `es-ES.json`
3. Execute os testes: `npm run test`

---

## 📦 Estrutura de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo>): <descrição>

[corpo opcional]

[rodapé opcional]
```

### Tipos

| Tipo | Descrição |
|------|-----------|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Alteração em documentação |
| `style` | Formatação (não afeta código) |
| `refactor` | Refatoração (sem mudança de funcionalidade) |
| `test` | Adição/modificação de testes |
| `chore` | Tarefas de manutenção |
| `i18n` | Traduções |
| `security` | Correções de segurança |

### Exemplos

```bash
feat(dashboard): add period comparison chart
fix(auth): resolve rate limiting on mobile
docs(api): update ai-assistant endpoint examples
i18n(es-ES): add settings translations
security(rls): fix policy for answers table
```

---

## 🔀 Pull Requests

### Checklist

- [ ] Código segue os padrões do projeto
- [ ] Testes adicionados/atualizados (se aplicável)
- [ ] Documentação atualizada (se aplicável)
- [ ] Traduções incluídas (PT-BR, EN-US, ES-ES)
- [ ] Sem breaking changes (ou documentado)
- [ ] Build passa: `npm run build`
- [ ] Testes passam: `npm run test`
- [ ] Lint passa: `npm run lint`

### Template de PR

```markdown
## Descrição

Breve descrição das mudanças.

## Tipo de Mudança

- [ ] Bug fix
- [ ] Nova feature
- [ ] Breaking change
- [ ] Documentação

## Como Testar

1. Passo 1
2. Passo 2
3. Resultado esperado

## Screenshots (se aplicável)

## Checklist

- [ ] Self-review realizado
- [ ] Testes adicionados
- [ ] Docs atualizados
```

---

## 🐛 Reportando Bugs

### Template de Issue

```markdown
## Descrição do Bug

Descrição clara e concisa.

## Passos para Reproduzir

1. Vá para '...'
2. Clique em '...'
3. Role até '...'
4. Veja o erro

## Comportamento Esperado

O que deveria acontecer.

## Screenshots

Se aplicável.

## Ambiente

- Navegador: [ex: Chrome 120]
- OS: [ex: Windows 11]
- Versão do Projeto: [ex: 1.2.0]

## Contexto Adicional

Qualquer outro contexto.
```

---

## 💡 Sugerindo Features

### Template de Feature Request

```markdown
## Problema

Descrição do problema que essa feature resolve.

## Solução Proposta

Descrição clara da solução.

## Alternativas Consideradas

Outras soluções que você considerou.

## Contexto Adicional

Mockups, exemplos, etc.
```

---

## 📁 Adicionando Novos Frameworks de Segurança

1. Adicione o framework em `src/data/frameworks.json`:

```json
{
  "framework_id": "NEW_FRAMEWORK",
  "framework_name": "New Framework Name",
  "short_name": "NFN",
  "category": "compliance",
  "description": "Framework description",
  "version": "1.0",
  "security_domain_id": "AI_SECURITY"
}
```

2. Adicione questões mapeadas em `src/data/questions.json`:

```json
{
  "question_id": "DOMAIN-01-Q01",
  "domain_id": "DOMAIN-01",
  "subcat_id": "DOMAIN-01-SC01",
  "question_text": "Question text?",
  "frameworks": ["NEW_FRAMEWORK", "EXISTING_FRAMEWORK"],
  "security_domain_id": "AI_SECURITY"
}
```

3. Execute os testes e crie PR.

---

## 🌍 Adicionando Traduções

1. Copie o arquivo de referência:
   ```bash
   cp src/i18n/locales/en-US.json src/i18n/locales/xx-XX.json
   ```

2. Traduza todas as strings

3. Adicione o idioma em `src/i18n/index.ts`:
   ```typescript
   import xxXX from './locales/xx-XX.json';
   
   resources: {
     'xx-XX': { translation: xxXX },
   }
   ```

4. Adicione no `LanguageSelector.tsx`

5. Execute os testes de i18n: `npm run test`

---

## 📞 Dúvidas?

- Abra uma [Discussion](https://github.com/SEU_USUARIO/trustlayer/discussions) para perguntas
- Junte-se ao nosso canal de comunicação

---

Desenvolvido com ❤️ pela comunidade TrustLayer
