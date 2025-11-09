# Salesforce Certifications Study — Desktop Web

Pequeno site para estudar certificações Salesforce (desktop).

Funcionalidades:
- Seleção de certificação (ex.: Administrator, Developer).
- Exibição de perguntas múltipla escolha por certificação.
- Seleção de alternativas (suporta múltiplas respostas).
- Confirmação e feedback imediato (correta/errada).
- Navegação entre perguntas e tela de resultado.

Como usar:
1. Abra `index.html` em um navegador desktop (arrastar/abrir localmente é suficiente).
2. Selecione uma certificação.
3. Responda às perguntas e clique em "Confirmar" para ver o feedback.

Estrutura:
- `index.html` — UI principal
- `styles.css` — estilos
- `app.js` — lógica JavaScript
- `questions/` — pasta com arquivos JSON individuais para cada certificação
  - `jsdev1.json` — JavaScript Developer I (186 perguntas)

Observações:
- As perguntas são carregadas da pasta `questions/` (arquivos JSON modulares).
- Cada certificação tem arquivo próprio com metadados (tempo recomendado, número de questões, etc.).
- Melhorias possíveis: salvar progresso no localStorage, timer, banco de questões, modo mobile.

Desenvolvido como protótipo para uso local.
