<p align="center">
  <img src="zume-frontend/public/assets/path58.png" width="72" alt="ZUME logo" />
</p>

<h1 align="center">ZUME</h1>

<p align="center">
  Plataforma web de produtividade e estudo com timer Pomodoro, salas colaborativas em tempo real e geração de conteúdo via Inteligência Artificial.
</p>

<p align="center">
  <a href="https://zume-78q.pages.dev"><strong>🌐 Acessar aplicação</strong></a>
  &nbsp;·&nbsp;
  <a href="#-como-rodar-localmente"><strong>⚙️ Rodar localmente</strong></a>
  &nbsp;·&nbsp;
  <a href="#-arquitetura"><strong>📐 Arquitetura</strong></a>
</p>

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white">
  <img alt="Socket.io" src="https://img.shields.io/badge/Socket.io-4.x-010101?logo=socket.io">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green">
</p>

---

## Índice

- [Sobre o projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Arquitetura](#-arquitetura)
- [Stack tecnológica](#-stack-tecnológica)
- [Estrutura de pastas](#-estrutura-de-pastas)
- [Como rodar localmente](#-como-rodar-localmente)
- [Variáveis de ambiente](#-variáveis-de-ambiente)
- [API Reference](#-api-reference)
- [Segurança](#-segurança)
- [Deploy](#-deploy)
- [Roadmap](#-roadmap)
- [Contribuindo](#-contribuindo)
- [Licença](#-licença)

---

## 🍅 Sobre o projeto

O **ZUME** nasceu como um projeto acadêmico e evoluiu para uma plataforma completa de produtividade voltada para estudantes. A proposta central é combinar o método Pomodoro com recursos modernos — colaboração em tempo real, inteligência artificial e gamificação — em uma única interface limpa e responsiva.

O projeto é desenvolvido com uma arquitetura desacoplada: frontend React servido via CDN (Cloudflare Pages) e backend Node.js hospedado no Render, comunicando-se via REST e WebSocket.

---

## ✨ Funcionalidades

### Timer Pomodoro
- Modos configuráveis: Padrão (25/5 min), Foco (45/10 min) e Foco Total (60/15 min)
- Timer persistente entre navegação de páginas — o cronômetro não reinicia ao trocar de rota
- Registro automático de sessões no banco de dados ao final de cada ciclo

### Salas de Foco Colaborativas
- Criação e entrada em salas por código único
- Timer sincronizado em tempo real para todos os participantes via WebSocket (Socket.io)
- Rate limiting por evento para proteger contra flood
- Autenticação JWT em cada conexão de socket

### Gerador de Conteúdo com IA
- Upload de arquivos `.txt` e `.pdf` ou entrada de texto livre
- Geração de **resumos estruturados** com suporte a Markdown e fórmulas LaTeX (MathJax)
- Geração de **roteiros de estudo** progressivos
- Geração de **flash cards** com 4 níveis de dificuldade (Muito Fácil → Difícil)
- Cards interativos com animação de flip e navegação sequencial

### Sistema de Conquistas
- 20 conquistas desbloqueáveis por tempo de estudo e dias consecutivos (streak)
- Usuário pode destacar até 3 conquistas no perfil
- Emojis das conquistas em destaque substituem o ID no card de perfil

### Autenticação e Perfil
- Cadastro e login com senha armazenada via bcrypt
- Sessões autenticadas por JWT (token no localStorage)
- Upload de avatar personalizado
- Dashboard com estatísticas: total estudado, número de sessões e streak atual

---

## 📐 Arquitetura

```
┌─────────────────────┐        HTTPS / REST        ┌──────────────────────┐
│                     │ ─────────────────────────► │                      │
│  Cloudflare Pages   │                             │   Render (Node.js)   │
│  React + Vite       │ ◄───────────────────────── │   Express + Socket.io│
│  zume-78q.pages.dev │        WebSocket            │  zume-fawu.onrender  │
└─────────────────────┘                             └──────────┬───────────┘
                                                               │
                                                    ┌──────────▼───────────┐
                                                    │  Supabase (PostgreSQL)│
                                                    │  usuarios + sessoes   │
                                                    └──────────────────────┘
                                                               │
                                                    ┌──────────▼───────────┐
                                                    │     Groq API          │
                                                    │  llama-3.3-70b        │
                                                    └──────────────────────┘
```

**Decisões de arquitetura relevantes:**

- O componente `Pomodoro` fica **sempre montado** no DOM após o login (ocultado via CSS nas outras rotas), garantindo que o timer nunca reinicie ao navegar entre páginas.
- O estado das salas de foco é mantido **em memória no servidor** (Map), sem persistência em banco — adequado para sessões efêmeras e de baixa latência.
- A integração com IA é feita exclusivamente no backend: o frontend envia `{ mensagem, tipo }` e recebe o retorno da Groq, sem expor a chave de API ao cliente.

---

## 🛠️ Stack tecnológica

### Frontend
| Tecnologia | Versão | Uso |
|---|---|---|
| React | 18 | UI e gerenciamento de estado |
| Vite | 8 | Bundler e dev server |
| React Router DOM | 6 | Roteamento SPA |
| Socket.io Client | 4 | Comunicação WebSocket |
| Marked.js | CDN | Renderização de Markdown |
| MathJax | 3 (CDN) | Renderização de LaTeX |
| PDF.js | CDN | Extração de texto de PDFs |
| DOMPurify | CDN | Sanitização de HTML |

### Backend
| Tecnologia | Versão | Uso |
|---|---|---|
| Node.js | 24 | Runtime |
| Express | 4.21 | Framework HTTP |
| Socket.io | 4.8 | WebSocket (salas de foco) |
| PostgreSQL (pg) | 8.21 | Banco de dados |
| JWT | 9.0 | Autenticação |
| bcrypt | 6.0 | Hash de senhas |
| Zod | 3.23 | Validação de entrada |
| Helmet | 8.0 | Headers de segurança HTTP |
| express-rate-limit | 7.4 | Rate limiting nas rotas REST |

---

## 📁 Estrutura de pastas

```
ZUME/
├── backend-node/               # API REST + WebSocket
│   ├── config/
│   │   └── db.js               # Conexão PostgreSQL e inicialização das tabelas
│   ├── middleware/
│   │   ├── auth.js             # Verificação JWT
│   │   └── rateLimit.js        # Limitadores de requisição (geral e IA)
│   ├── routes/
│   │   ├── auth.js             # POST /auth/cadastro, POST /auth/login
│   │   ├── sessoes.js          # GET /sessoes, POST /sessoes/salvar, GET /sessoes/tempo_total
│   │   ├── ia.js               # POST /ia (validação Zod + Groq)
│   │   └── usuario.js          # GET /usuario/perfil
│   ├── services/
│   │   └── iaService.js        # Montagem do payload e chamada à Groq API
│   ├── sockets/
│   │   └── salaFoco.js         # Lógica de salas colaborativas (Socket.io)
│   ├── server.js               # Entry point — CORS, middlewares, rotas, Socket.io
│   ├── .env.example            # Template de variáveis de ambiente
│   └── package.json
│
└── zume-frontend/              # SPA React
    ├── public/                 # Assets estáticos (ícones, imagens, _redirects)
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx      # Navbar responsiva com duas variantes visuais
    │   │   └── ProtectedRoute.jsx  # HOC de autenticação
    │   ├── lib/
    │   │   ├── api.js          # URL base da API (VITE_API_URL)
    │   │   ├── auth.js         # Token JWT, dados do usuário, logout
    │   │   ├── socket.js       # Singleton do Socket.io Client
    │   │   ├── offlineSync.js  # Sincronização de sessões offline
    │   │   └── notifications.js # Notificações do browser
    │   ├── pages/
    │   │   ├── Login.jsx       # Tela de login e cadastro
    │   │   ├── Pomodoro.jsx    # Timer Pomodoro com modos e registro de sessão
    │   │   ├── EstudoIA.jsx    # Gerador de resumos e roteiros com IA
    │   │   ├── FlashCards.jsx  # Gerador de flash cards com IA e seletor de dificuldade
    │   │   ├── SalaFoco.jsx    # Salas colaborativas em tempo real
    │   │   └── Conta.jsx       # Perfil, estatísticas e conquistas
    │   ├── App.jsx             # Roteamento principal
    │   └── main.jsx            # Entry point React
    ├── .env.example
    └── package.json
```

---

## ⚙️ Como rodar localmente

### Pré-requisitos

- [Node.js](https://nodejs.org) 18 ou superior
- Conta no [Supabase](https://supabase.com) com um projeto PostgreSQL criado (ou outra instância PostgreSQL)
- Chave de API da [Groq](https://console.groq.com)

### 1. Clone o repositório

```bash
git clone https://github.com/sam77g/ZUME.git
cd ZUME
```

### 2. Configure e inicie o backend

```bash
cd backend-node
npm install
cp .env.example .env
```

Edite o `.env` com suas credenciais (veja a seção [Variáveis de ambiente](#-variáveis-de-ambiente)).

```bash
npm run dev
# Servidor disponível em http://localhost:3000
```

O servidor inicializa as tabelas `usuarios` e `sessoes` automaticamente na primeira execução.

### 3. Configure e inicie o frontend

```bash
cd ../zume-frontend
npm install
cp .env.example .env.local
```

Edite `.env.local`:
```
VITE_API_URL=http://localhost:3000
```

```bash
npm run dev
# Aplicação disponível em http://localhost:5173
```

---

## 🔐 Variáveis de ambiente

### Backend — `backend-node/.env`

| Variável | Obrigatória | Descrição |
|---|---|---|
| `PORT` | Não | Porta do servidor (padrão: `3000`) |
| `DATABASE_URL` | **Sim** | Connection string PostgreSQL (ex: `postgres://user:pass@host:5432/db`) |
| `JWT_SECRET` | **Sim** | Chave de assinatura JWT — mínimo 32 caracteres |
| `GROQ_API_KEY` | **Sim** | Chave da API Groq (obter em [console.groq.com](https://console.groq.com)) |
| `FRONTEND_URL` | Não | Origem(s) permitidas no CORS. Separe múltiplas por vírgula |

> **Atenção:** o servidor recusa inicialização se `JWT_SECRET` tiver menos de 32 caracteres ou se `GROQ_API_KEY` estiver ausente.

### Frontend — `zume-frontend/.env.local`

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_API_URL` | **Sim** | URL base do backend (ex: `http://localhost:3000`) |

---

## 📡 API Reference

Todas as rotas protegidas exigem o header:
```
Authorization: Bearer <token>
```

### Autenticação

| Método | Rota | Body | Descrição |
|---|---|---|---|
| `POST` | `/auth/cadastro` | `{ nome, email, senha }` | Cria novo usuário |
| `POST` | `/auth/login` | `{ email, senha }` | Retorna JWT + dados do usuário |

### Sessões _(autenticado)_

| Método | Rota | Body | Descrição |
|---|---|---|---|
| `GET` | `/sessoes` | — | Lista sessões do usuário |
| `POST` | `/sessoes/salvar` | `{ duracao_seg }` | Registra sessão de estudo |
| `GET` | `/sessoes/tempo_total` | — | Retorna total em segundos e número de sessões |

### IA _(autenticado)_

| Método | Rota | Body | Descrição |
|---|---|---|---|
| `POST` | `/ia` | `{ mensagem: string (max 4000), tipo?: "resumo" \| "duvida" \| "plano" }` | Envia texto para o modelo Groq e retorna a resposta |

> O modelo utilizado é `llama-3.3-70b-versatile`. O `tipo` define o system prompt enviado ao modelo.

### WebSocket — Salas de Foco

Conexão em `wss://zume-fawu.onrender.com` com autenticação via `{ auth: { token } }`.

| Evento (emit) | Payload | Descrição |
|---|---|---|
| `sala:entrar` | `codigo: string` | Entra ou cria uma sala pelo código |
| `sala:iniciar` | `{ codigo, duracaoSeg, fase }` | Inicia o timer para todos na sala |
| `sala:pausar` | `codigo: string` | Pausa o timer |
| `sala:sair` | — | Sai da sala atual |

| Evento (on) | Payload | Descrição |
|---|---|---|
| `sala:atualizada` | `{ codigo, usuarios, fase, duracaoSeg, iniciadoEm, rodando }` | Estado atual da sala |
| `sala:erro` | `{ msg: string }` | Erro (ex: `"muitas_requisicoes"`) |

---

## 🔒 Segurança

| Camada | Implementação |
|---|---|
| Senhas | Hash com `bcrypt` (rounds padrão) |
| Autenticação | JWT assinado com secret de mínimo 32 chars |
| Validação de entrada | Zod em todas as rotas (rejeita payloads malformados com 400) |
| Rate limiting REST | `express-rate-limit` com limite geral e limite específico para `/ia` |
| Rate limiting WebSocket | Throttle em memória por `socket.id` por evento |
| Headers HTTP | `helmet` com configuração padrão |
| CORS | Validação de origem via allowlist; configurável por `FRONTEND_URL` |
| Segredos | Validados no boot do servidor — processo encerra com `exit(1)` se ausentes |

---

## 🚀 Deploy

| Camada | Plataforma | URL |
|---|---|---|
| Frontend | Cloudflare Pages | [zume-78q.pages.dev](https://zume-78q.pages.dev) |
| Backend | Render (Free tier) | [zume-fawu.onrender.com](https://zume-fawu.onrender.com) |
| Banco de dados | Supabase (PostgreSQL) | — |

> **Nota sobre cold start:** o plano gratuito do Render hiberna o serviço após 15 minutos de inatividade. A primeira requisição após hibernação pode levar até 30 segundos.

### Configuração no Cloudflare Pages

| Campo | Valor |
|---|---|
| Root directory | `zume-frontend` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Variável de ambiente | `VITE_API_URL=https://zume-fawu.onrender.com` |

O arquivo `public/_redirects` já está configurado para suportar roteamento SPA:
```
/* /index.html 200
```

---

## 🗺️ Roadmap

- [x] Timer Pomodoro com múltiplos modos
- [x] Autenticação JWT (cadastro + login)
- [x] Registro de sessões no PostgreSQL
- [x] Salas de foco colaborativas (WebSocket)
- [x] Gerador de resumos e roteiros com IA
- [x] Flash cards com IA e seletor de dificuldade
- [x] Sistema de conquistas e destaques no perfil
- [x] Analytics de sessões com IA
- [x] Plano de estudos personalizado por IA
- [ ] App mobile (Capacitor — `capacitor.config.json` já presente)
- [ ] Sistema de planos (Basic / Pro / Plus) com limites de uso

---

## 🤝 Contribuindo

Contribuições são bem-vindas. Siga o fluxo abaixo:

1. Faça um fork do repositório
2. Crie uma branch descritiva: `git checkout -b feat/nome-da-feature`
3. Faça commits seguindo [Conventional Commits](https://www.conventionalcommits.org/pt-br/):
   - `feat:` nova funcionalidade
   - `fix:` correção de bug
   - `chore:` manutenção, dependências
   - `docs:` documentação
4. Abra um Pull Request descrevendo o que foi feito e por quê

### Padrões do projeto

- **Backend:** CommonJS (`require`), sem TypeScript por ora
- **Frontend:** ESModules, React functional components com hooks
- **Commits:** Conventional Commits obrigatório
- **Validação:** toda entrada no backend deve passar por schema Zod
- **Segredos:** nunca commitar `.env` — usar `.env.example` como template

---

## 📄 Licença

Distribuído sob a licença MIT. Veja [LICENSE](./LICENSE) para mais informações.

---

<p align="center">Desenvolvido por <a href="https://github.com/sam77g">Samuel</a></p>
