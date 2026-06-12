# 🍅 ZUME — Plataforma de Produtividade e Estudo

O **ZUME** é uma plataforma web completa voltada para o foco, gerenciamento de tempo e otimização dos estudos. O projeto integra o clássico método **Pomodoro** a recursos modernos, como o acompanhamento de metas diárias, registro de *streaks* (dias consecutivos de estudo), histórico em calendário e assistência de Inteligência Artificial para geração automática de resumos e roteiros de estudo a partir de arquivos e notas do estudante.

Este repositório compreende a arquitetura unificada do sistema, contendo um frontend responsivo e dinâmico integrado a um backend robusto em **Node.js** com **Express** e banco de dados **SQLite**.

---

## 🚀 Funcionalidades Principais

- **Timer Pomodoro Customizável:** Modos adaptados para diferentes ritmos de foco (Padrão, Pausa Curta, Pausa Longa, Foco, Foco Total) com transição visual automática entre as fases de estudo e descanso.
- **Persistência Multi-usuário Localizada:** Isolamento de dados de progresso (`pomodorosDia`, `minutosDia`, conquistas e avatares) no navegador através de chaves únicas por usuário no `localStorage`.
- **Dashboard de Metas e Calendário:** Painel interativo demonstrando o progresso diário de minutos estudados e um calendário de *streaks* mensal para acompanhamento de consistência.
- **Integração com IA (Groq API):** Módulo inteligente capaz de analisar materiais de estudo e gerar de forma automatizada:
  - 📋 **Resumos Estruturados** do conteúdo.
  - 🗺️ **Roteiros Dinâmicos de Estudo** personalizados.
- **Renderização Matemática e Markdown:** Suporte nativo a fórmulas matemáticas complexas via **MathJax** e formatação rica de texto usando **Marked**.
- **Sistema de Autenticação Completo:** Telas de Login e Cadastro integradas de ponta a ponta com o backend rodando em banco de dados SQLite.

---

## 🛠️ Tecnologias Utilizadas

### **Frontend**
- **HTML5 & CSS3** (Layout responsivo com variáveis CSS nativas e tipografia personalizada *MuseoModerno*)
- **JavaScript (ES6+)** (Manipulação assíncrona do DOM e requisições Fetch API)
- **Marked.js** (Renderização fluida de Markdown para as respostas da IA)
- **MathJax v3** (Exibição perfeita de fórmulas matemáticas e equações em LaTeX)
- **PDF.js** (Suporte para leitura e extração de conteúdos em documentos PDF)

### **Backend**
- **Node.js** & **Express** (Estrutura de rotas HTTP, tratamento de CORS e JSON parser)
- **Better-SQLite3** (Banco de dados relacional leve e de altíssima performance para persistência de usuários e sessões de estudo)
- **Crypto** (Módulo nativo para segurança de credenciais e utilitários de hash)
- **Fetch API** (Integração assíncrona com os modelos de LLM da Groq)

---

## 📦 Estrutura do Projeto

```bash
├── assets/               # Imagens, ícones e recursos visuais do sistema
├── logos_google/         # Ícones e assets de interface baseados no Material Design
├── pomodoro/
│   ├── pomodoro.html     # Painel principal do timer, metas e calendário
│   ├── pomodoro.css      # Estilização exclusiva do módulo pomodoro
│   └── pomodoro.js       # Regras de negócio do cronômetro, intervalos e armazenamento
├── index.html            # Arquivo raiz de redirecionamento do ecossistema
├── login.html            # Interface de autenticação (Login e Cadastro alternáveis)
├── script02.js           # Orquestrador do frontend para requisições de login/cadastro
├── conta.html            # Dashboard de perfil do usuário e estatísticas de conquistas
├── teste.html            # Área de estudos integrada com a IA da Groq
├── server.js             # Servidor Backend em Node.js / Express com rotas de API e Banco SQLite
└── README.md             # Documentação oficial do projeto
```
## Como Rodar o Projeto Localmente
Pré-requisitos
Antes de iniciar, certifique-se de ter instalado em sua máquina:

Node.js (versão 16 ou superior recomendada)

Um editor de código (como o VS Code)

### 1. Configurando o Backend
Clone o repositório e acesse a branch correta:
```
Bash
git clone [https://github.com/sam77g/ZUME.git](https://github.com/sam77g/ZUME.git)
cd ZUME
git checkout backend-nodejs
```
Instale as dependências necessárias do servidor:

```
Bash
npm install express cors better-sqlite3
```

(Ou simplesmente execute npm install caso o seu repositório possua o arquivo package.json configurado)

Adicione sua chave de API da Groq às variáveis de ambiente do sistema (Opcional — necessário apenas se desejar usar as funções de assistência por IA localmente):

No Linux/macOS:
```
Bash
export GROQ_API_KEY="sua_chave_aqui"
```
No Windows (Prompt de Comando):
```
DOS
set GROQ_API_KEY=sua_chave_aqui
No Windows (PowerShell):
```
```
PowerShell
$env:GROQ_API_KEY="sua_chave_aqui"
```
Inicialize o servidor backend:
```
Bash
node server.js
O servidor iniciará por padrão na porta 3000 (ou na porta definida pela variável global PORT) e criará automaticamente o banco de dados local chamado pomodoro.db.
```
2. Configurando o Frontend
Como o frontend é composto por páginas estáticas em HTML/CSS/JS puros, você não precisa compilar nem empacotar os arquivos.

Abra a pasta do projeto em seu navegador. Para evitar restrições de políticas de CORS em requisições locais, recomenda-se utilizar a extensão Live Server no VS Code.

Caso queira que o frontend interaja com o seu servidor local que acabou de subir no passo anterior (ao invés do servidor de produção), lembre-se de alterar a constante API nos arquivos de script front-end (script02.js, pomodoro.js, etc.) para apontar localmente:
```
JavaScript
const API = "http://localhost:3000";
Acesse login.html através do seu servidor local ou Live Server para se cadastrar e começar a utilizar a plataforma.
```
🌐 Como Acessar o Projeto Online
O ecossistema do ZUME já está configurado e disponível publicamente na nuvem para uso direto e integrado:

Frontend (Interface do Usuário): Pode ser acessado diretamente através das GitHub Pages no link oficial:
👉 https://sam77g.github.io/ZUME

Backend (API e Banco de Dados):
O servidor Node.js está hospedado de forma contínua na plataforma Render sob a URL base:
https://zume-fawu.onrender.com

Nota de Arquitetura: Quando você interage com o sistema hospedado no GitHub Pages, os scripts integrados no cliente realizam todas as chamadas assíncronas e persistência de dados de forma nativa e automática com o servidor de produção no Render. Isso garante que logins, cadastro de sessões e requisições à Inteligência Artificial funcionem em tempo real de qualquer lugar, sem necessidade de deploy adicional.

Desenvolvido como Trabalho de Discente Efetivo (TDE) para a disciplina de Introdução à Linguagem de Programação. 🚀
