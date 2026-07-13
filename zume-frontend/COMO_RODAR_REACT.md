# ZUME — Frontend React + Vite (Sprint 3 adaptado)

## O que foi feito

- Projeto Vite + React criado do zero (`zume-frontend/`)
- 4 páginas portadas 1:1 (mesma UI, mesmas classes CSS, mesma lógica):
  - `Login` (`/login`) — login.html + script02.js
  - `Pomodoro` (`/pomodoro`) — pomodoro.html + pomodoro.js (timer, metas, streak, calendário)
  - `Conta` (`/conta`) — conta.html (perfil, stats, conquistas)
  - `Estudo com IA` (`/estudo-ia`) — teste.html (upload de PDF/TXT, resumo/roteiro via IA)
- Roteamento com `react-router-dom`, rotas protegidas por JWT (redireciona pro login se não tiver token)
- Todo o auth/localStorage/token JWT continua igual ao que vocês já tinham (nada mudou no backend)
- Capacitor configurado no `package.json` (dependências instaladas + `capacitor.config.json`), mas **sem** adicionar a plataforma Android ainda — isso só quando vocês tiverem Android Studio ou usarem um serviço de build na nuvem

## Pequenas melhorias que adicionei (opcional, dá pra reverter)

- Botão de **Sair (logout)** na página Conta — no código antigo existia a lógica de logout (`btnLogout`) mas não tinha botão nenhum na tela, então nunca era usado
- Corrigi dois bugs de "stale closure" que existiam na lógica do timer quando portada pra React (sem isso, pomodoros/minutos do dia podiam ficar desatualizados depois do 2º ciclo de foco/pausa)

## Como rodar

```bash
cd zume-frontend
npm install
cp .env.example .env    # ajuste VITE_API_URL se o backend não estiver em localhost:3000
npm run dev
```

Abre em `http://localhost:5173`. Deixa o backend (`backend-node`) rodando em paralelo na porta 3000, igual antes.

Repare que o `server.js` do backend já libera CORS pra `localhost:5173` — ou seja, o backend já estava pronto pra essa migração.

## Build de produção

```bash
npm run build      # gera a pasta dist/
npm run preview    # testa o build localmente
```

## Sobre o Capacitor (Sprint 3 completo, quando puderem)

Quando tiverem acesso a um ambiente com Android SDK (Android Studio, ou uma VM/CI na nuvem tipo GitHub Actions), os próximos passos são:

```bash
npm run cap:add:android   # cria a pasta android/ (gradle, etc.)
npm run cap:sync          # builda o Vite e sincroniza com o projeto nativo
npm run cap:open:android  # abre no Android Studio pra gerar o APK
```

Não precisa mexer em nada além disso — o `capacitor.config.json` já aponta pro `dist/` como `webDir`.

## Próximos passos sugeridos (retomando o roadmap)

1. Testar as 4 páginas com o backend rodando de verdade (login, timer, conquistas, IA)
2. Sprint 3 completo: notificações nativas + sync offline-first (precisam do Capacitor instalado, aí sim)
3. Sprint 4: sessões colaborativas com Socket.io
