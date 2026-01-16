# 📸 Screenshots do TrustLayer

Esta pasta contém os screenshots da plataforma TrustLayer para documentação.

## ✅ Screenshots Disponíveis

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| `login.png` | Tela de login com credenciais demo | ✅ |

### Em `src/assets/screenshots/`:

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| `assessment.png` | Questionário de avaliação | ✅ |
| `dashboard-executive.png` | Dashboard Executivo | ✅ |
| `dashboard-grc.png` | Dashboard GRC | ✅ |
| `dashboard-specialist.png` | Dashboard Especialista | ✅ |
| `ai-assistant.png` | Painel do Assistente de IA | ✅ |
| `frameworks.png` | Gestão de Frameworks | ✅ |

## 📋 Screenshots Sugeridos

| Arquivo | Descrição | Rota |
|---------|-----------|------|
| `voice-profile.png` | Cadastro de perfil de voz | `/profile` |
| `voice-recording.png` | Gravação com ondas sonoras em tempo real | `/profile` |
| `period-comparison.png` | Card de comparação de períodos | `/dashboard/executive` |
| `settings-siem.png` | Integrações SIEM | `/settings` (aba Integrações) |
| `settings-questions.png` | Gestão de Questões | `/settings` (aba Questões) |
| `dark-theme.png` | Qualquer tela em tema escuro | Qualquer página |
| `mobile-view.png` | Visualização mobile responsiva | Qualquer página |

## 📐 Especificações

- **Resolução recomendada**: 1920x1080 ou 1440x900
- **Formato**: PNG
- **Tema**: Capture em tema claro (exceto `dark-theme.png`)
- **Dados**: Use dados de demonstração para screenshots mais realistas

## 🛠️ Como Capturar

1. Faça login com a conta demo (`demo@aiassess.app` / `Demo@2025!`)
2. Execute a função `init-demo-data` para popular dados
3. Navegue até cada página e capture o screenshot
4. Salve com os nomes exatos listados acima

## 🎤 Voice Profile Screenshots

Para capturar screenshots do sistema de voz:

1. Navegue até `/profile`
2. Localize o card "Perfil de Voz"
3. Para `voice-profile.png`: Capture o card com opções de enrollment
4. Para `voice-recording.png`: 
   - Inicie o cadastro de voz
   - Clique em "Gravar Frase"
   - Capture enquanto as barras de áudio estão animadas

## 📝 Notas

- Redimensione o navegador para mostrar a área mais relevante
- Para o AI Assistant, abra o painel antes de capturar
- Para Period Comparison, selecione dois períodos com dados
- Para SIEM, adicione pelo menos uma integração de exemplo
- Para Voice Recording, capture durante a gravação para ver as ondas sonoras
