# ZUME — Backend

API REST + WebSocket para o app de estudos ZUME.

## Stack

- Node.js + Express
- Socket.io (salas de foco colaborativas)
- PostgreSQL (pg)
- JWT (autenticação)
- Groq API (IA)
- Zod (validação)

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

| Variável | Descrição |
|---|---|
| PORT | Porta do servidor (padrão 3000) |
| DATABASE_URL | Connection string do PostgreSQL |
| JWT_SECRET | Chave secreta (mín. 32 chars) |
| GROQ_API_KEY | Chave da API Groq |
| FRONTEND_URL | Origem(s) permitidas no CORS (vírgula para múltiplos) |

## Rodando localmente

```bash
npm install
cp .env.example .env
# edite .env com suas credenciais
npm run dev
```

## Deploy sugerido

- **Backend:** Railway ou Render (suportam PostgreSQL + Node nativamente)
- **Frontend:** Vercel ou GitHub Pages (build estático do Vite)

## Endpoints principais

| Método | Rota | Descrição |
|---|---|---|
| POST | /auth/cadastro | Cadastro de usuário |
| POST | /auth/login | Login |
| GET | /sessoes | Listar sessões |
| POST | /sessoes/salvar | Salvar sessão de estudo |
| POST | /ia | Consulta à IA (autenticado) |
| WS | /socket.io | Sala de foco colaborativa |