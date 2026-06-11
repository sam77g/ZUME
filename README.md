# ZUME - Plataforma de Estudos e Produtividade

## Sobre o Projeto

O **ZUME** é uma plataforma web desenvolvida como Trabalho de Discente Efetivo da disciplina de **Introdução à Linguagem de Programação**.

O sistema foi criado com o objetivo de auxiliar estudantes na organização dos estudos, utilizando técnicas de produtividade e ferramentas de aprendizado ativo. A plataforma reúne funcionalidades como cronômetro Pomodoro, gerenciamento de metas, autenticação de usuários, geração de materiais de estudo e integração com Inteligência Artificial.

---

## Objetivos

* Melhorar a produtividade durante os estudos.
* Auxiliar na organização do tempo.
* Incentivar o aprendizado ativo através de resumos e testes.
* Centralizar ferramentas úteis para estudantes em uma única plataforma.

---

## Funcionalidades

### Sistema de Cadastro e Login

* Cadastro de novos usuários.
* Login utilizando e-mail e senha.
* Armazenamento seguro das credenciais.
* Persistência de dados utilizando banco de dados SQLite.

### Pomodoro Inteligente

* Cronômetro Pomodoro para sessões de estudo.
* Modos de foco pré-configurados:

  * 25 minutos de estudo
  * 30 minutos de estudo
  * 50 minutos de foco
  * 60 minutos de foco total
* Controle de início, pausa e reinício.
* Alarme sonoro ao final das sessões.
* Barra de progresso em tempo real.

### Sistema de Metas

* Controle de pomodoros concluídos no dia.
* Controle de minutos estudados.
* Metas diárias de produtividade.
* Sistema de sequência de estudos (streak).

### Ferramentas de Estudo

* Upload de arquivos para análise.
* Área para inserção de textos e anotações.
* Geração de conteúdo para revisão.
* Suporte a fórmulas matemáticas utilizando MathJax.

### Inteligência Artificial

* Estrutura preparada para integração com IA.
* Possibilidade de geração automática de:

  * Resumos
  * Questões
  * Materiais de revisão
  * Conteúdo educacional personalizado

### Interface Responsiva

* Design moderno voltado para estudantes.
* Navegação intuitiva.
* Compatibilidade com computadores e dispositivos móveis.

---

## Tecnologias Utilizadas

### Frontend

* HTML5
* CSS3
* JavaScript (ES6+)

### Bibliotecas Frontend

* PDF.js
* Marked.js
* MathJax
* Web Audio API

### Backend

* Linguagem C
* GNU Make

### Banco de Dados

* SQLite3

### APIs e Bibliotecas do Backend

* libmicrohttpd
* libcurl
* OpenSSL

### Controle de Versão

* Git
* GitHub

---

## Estrutura do Projeto

```text
tde2.0/
│
├── backend/
│   ├── server.c
│   ├── Makefile
│   └── pomodoro.db
│
├── frontend/
│   ├── login.html
│   ├── conta.html
│   ├── teste.html
│   ├── script02.js
│   └── style02.css
│
├── pomodoro/
│   ├── pomodoro.html
│   ├── pomodoro.js
│   └── pomodoro.css
│
├── assets/
├── logos_google/
├── fonts_google/
└── README.md
```

---

## Como Executar o Projeto

### É necessário seguir os seguintes passos para rodar localmente :
```
sudo apt update

sudo apt install \
gcc \
make \
libsqlite3-dev \
libmicrohttpd-dev \
libssl-dev

### 1. Clonar o Repositório

```bash
git clone <url-do-repositorio>
cd tde2.0
```

### 2. Compilar o Backend

```bash
cd backend

gcc server.c -o server \
-lsqlite3 \
-lmicrohttpd \
-lpthread \
-lssl \
-lcrypto \
-lcurl
```

### 3. Executar o Servidor

```bash
./server
```

O backend ficará disponível em:

```text
http://localhost:8080
```

### 4. Abrir o Frontend

Abra o arquivo:

```text
frontend/login.html
```

ou utilize um servidor local para servir os arquivos da aplicação.

---



## Funcionalidades Futuras

* Flashcards inteligentes.
* Histórico completo de estudos.
* Dashboard com estatísticas avançadas.
* Recomendações personalizadas por IA.
* Sistema de ranking e gamificação.
* Aplicativo mobile.
* Armazenamento em nuvem.

---

## Autores

Projeto desenvolvido como Trabalho de Discente Efetivo da disciplina de Introdução à Linguagem de Programação.

---

## Licença

Projeto desenvolvido para fins acadêmicos e educacionais.
