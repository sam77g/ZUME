# 🍅 ZUME — Plataforma de Produtividade e Estudo
<p align="center">

<img src="https://img.shields.io/badge/Status-Ativo-success">

<img src="https://img.shields.io/badge/React-18-61DAFB">

<img src="https://img.shields.io/badge/Node.js-22-green">

<img src="https://img.shields.io/badge/PostgreSQL-Supabase-blue">

</p>

Plataforma web completa para foco e gerenciamento de estudos, integrando o método **Pomodoro** com salas colaborativas em tempo real e geração de conteúdo via **Inteligência Artificial**.

🔗 **[sam-zume.netlify.app](https://sam-zume.netlify.app)**

---

## ✨ Funcionalidades

- **Timer Pomodoro** com modos de foco e pausa customizáveis
- **Salas de foco colaborativas** — estude em tempo real com outros usuários via WebSocket
- **Gerador de conteúdo com IA** — resumos e roteiros de estudo a partir de texto ou PDF
- **Histórico de sessões** com dashboard de progresso
- **Autenticação completa** — cadastro, login e rotas protegidas por JWT

---

## 🛠️ Stack

### Frontend
- React 18 + Vite
- React Router DOM
- Socket.io Client
- Marked.js + MathJax (renderização de Markdown e LaTeX)
- PDF.js (extração de texto de PDFs)

### Backend
- Node.js + Express
- Socket.io (salas de foco em tempo real)
- PostgreSQL via Supabase (`pg`)
- JWT (autenticação)
- bcrypt (hash de senhas)
- Zod (validação de entrada)
- Helmet + rate-limit (segurança)
- Groq API (IA — modelo `llama3-8b-8192`)

---

## 📁 Estrutura

```
ZUME/
├── zume-frontend/          # React + Vite
│   ├── src/
│   │   ├── pages/          # Login, Pomodoro, EstudoIA, SalaFoco...
│   │   ├── components/     # Navbar e componentes reutilizáveis
│   │   └── lib/            # api.js, auth.js, socket.js
│   └── public/
│       └── _redirects      # Roteamento SPA no Netlify
└── backend-node/           # Node.js + Express
    ├── routes/             # auth, sessoes, ia, usuario
    ├── sockets/            # salaFoco.js (Socket.io)
    ├── services/           # iaService.js (Groq)
    ├── middleware/         # auth.js (JWT), rateLimit.js
    ├── config/             # db.js (PostgreSQL)
    ├── server.js
    └── .env.example
```

---

## ⚙️ Rodando localmente

### Pré-requisitos
- Node.js 18+
- PostgreSQL (ou conta no [Supabase](https://supabase.com))
- Chave da [Groq API](https://console.groq.com)

### Backend

```bash
cd backend-node
npm install
cp .env.example .env
# edite .env com suas credenciais
npm run dev
```

### Frontend

```bash
cd zume-frontend
npm install
# crie .env.local com:
# VITE_API_URL=http://localhost:3000
npm run dev
```

---

## 🌐 Variáveis de ambiente

### Backend (`backend-node/.env`)

| Variável | Descrição |
|---|---|
| `PORT` | Porta do servidor (padrão `3000`) |
| `DATABASE_URL` | Connection string do PostgreSQL |
| `JWT_SECRET` | Chave secreta mín. 32 caracteres |
| `GROQ_API_KEY` | Chave da API Groq |
| `FRONTEND_URL` | Origem permitida no CORS |

### Frontend (`zume-frontend/.env.local`)

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL base do backend |

---

## 🚀 Deploy

| Camada | Plataforma | URL |
|---|---|---|
| Frontend | Netlify | [sam-zume.netlify.app](https://sam-zume.netlify.app) |
| Backend | Render | [zume-fawu.onrender.com](https://zume-fawu.onrender.com) |
| Banco de dados | Supabase (PostgreSQL) | — |

---

## 🔒 Segurança

- Senhas com hash `bcrypt`
- Rotas protegidas por JWT
- Validação de entrada com Zod em todas as rotas
- Rate limiting nas rotas REST e eventos Socket.io
- CORS restrito à origem do frontend
- Variáveis sensíveis apenas em `.env` (nunca commitadas)

---
## 📄 Licença

Distribuído sob a licença MIT. Veja [LICENSE](./LICENSE) para mais informações.

Desenvolvido por [Samuel](https://github.com/sam77g).
