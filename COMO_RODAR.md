# Como rodar o ZUME localmente

## 1. Configurar variáveis de ambiente

Entre na pasta `backend-node/` e crie o arquivo `.env`:
```
DATABASE_URL=postgres://postgres:[SUA-SENHA]@db.[SEU-PROJETO].supabase.co:5432/postgres
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
PORT=3000
```

- **DATABASE_URL**: Supabase > Settings > Database > Connection string > URI
- **GROQ_API_KEY**: console.groq.com/keys

## 2. Instalar dependências

```bash
cd backend-node
npm install
```

## 3. Iniciar o servidor

```bash
npm start
```

Saída esperada:
```
[DATABASE] Conectado ao PostgreSQL!
[DATABASE] Tabelas OK.

🍅 ZUME Backend rodando em http://localhost:3000
```

## 4. Abrir o frontend

Abra a pasta `docs/` no VS Code e use **Live Server** na `login.html`.

Ou abra direto no navegador:
```
file:///caminho/para/ZUME-local/docs/login.html
```

> ⚠️ Se abrir com `file://`, algumas requisições podem ser bloqueadas pelo navegador.
> O Live Server resolve isso.

## Atalho para desenvolvimento

Em vez de `npm start`, use:

```bash
npm run dev
```

Isso reinicia o servidor automaticamente a cada mudança no `server.js` (Node 18+).
